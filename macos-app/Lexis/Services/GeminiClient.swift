import Foundation

/// Result of an extraction/reformat call: matches the reference backend's
/// structured {title, text} response shape.
struct ExtractedPage: Sendable {
    var title: String
    var text: String
}

protocol ExtractionService: Sendable {
    func extractPDFPage(_ pdfData: Data, model: String) async throws -> ExtractedPage
    func reformat(text: String, model: String) async throws -> ExtractedPage
    func keyTerms(in paragraph: String, model: String, maxTerms: Int) async throws -> [String]
}

/// Talks to the Gemini REST API directly (no SDK). Prompts and structured
/// output schema mirror backend/api/utils.py verbatim.
struct GeminiClient: ExtractionService {
    private let secrets: SecretsStore

    init(secrets: SecretsStore = KeychainStore()) {
        self.secrets = secrets
    }

    private static let extractPrompt = """
    Extract the text from the provided content. Return a JSON object with exactly two fields:
      - title: a short descriptive title (3–8 words) for this passage
      - text: the full extracted text as clean readable prose (no Markdown, no asterisks, no hashes, preserve paragraph breaks)
    Do not add any commentary outside the JSON object.
    """

    private static let reformatPrompt = """
    Reformat the following text as clean readable prose and give it a short title.
    Return a JSON object with exactly two fields:
      - title: a short descriptive title (3–8 words) for this passage
      - text: the reformatted prose (no Markdown, no asterisks, preserve paragraph breaks)


    """

    func extractPDFPage(_ pdfData: Data, model: String) async throws -> ExtractedPage {
        let parts: [[String: Any]] = [
            ["inline_data": ["mime_type": "application/pdf", "data": pdfData.base64EncodedString()]],
            ["text": Self.extractPrompt],
        ]
        return try await generateStructured(parts: parts, model: model)
    }

    func reformat(text: String, model: String) async throws -> ExtractedPage {
        let parts: [[String: Any]] = [["text": Self.reformatPrompt + text]]
        return try await generateStructured(parts: parts, model: model)
    }

    func keyTerms(in paragraph: String, model: String, maxTerms: Int = 6) async throws -> [String] {
        let prompt = """
        From the text below, choose up to \(maxTerms) individual words that are most worth looking up in a dictionary — prefer technical terms, uncommon words, or words central to understanding the passage. Return ONLY a valid JSON array of lowercase single words. Example: ["concurrent","lightweight"]

        Text:
        \(paragraph)
        """
        let raw = try await send(body: ["contents": [["parts": [["text": prompt]]]]], model: model)
        let cleaned = raw
            .replacingOccurrences(of: "```json", with: "")
            .replacingOccurrences(of: "```", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard let data = cleaned.data(using: .utf8),
              let words = try? JSONDecoder().decode([String].self, from: data)
        else {
            throw LexisError.decodingFailure(service: "Gemini", underlying: "key terms were not a JSON array")
        }
        return words
    }

    // MARK: - Structured (JSON schema) calls

    private func generateStructured(parts: [[String: Any]], model: String) async throws -> ExtractedPage {
        let body: [String: Any] = [
            "contents": [["parts": parts]],
            "generationConfig": [
                "responseMimeType": "application/json",
                "responseSchema": [
                    "type": "OBJECT",
                    "properties": [
                        "title": ["type": "STRING"],
                        "text": ["type": "STRING"],
                    ],
                    "required": ["title", "text"],
                ],
            ],
        ]
        let responseText = try await send(body: body, model: model)
        guard let jsonData = responseText.data(using: .utf8) else {
            throw LexisError.decodingFailure(service: "Gemini", underlying: "empty response")
        }
        struct Wrapper: Decodable { let title: String; let text: String }
        do {
            let wrapper = try JSONDecoder().decode(Wrapper.self, from: jsonData)
            return ExtractedPage(title: wrapper.title, text: wrapper.text)
        } catch {
            throw LexisError.decodingFailure(service: "Gemini", underlying: error.localizedDescription)
        }
    }

    // MARK: - Networking

    private func send(body: [String: Any], model: String) async throws -> String {
        guard let apiKey = secrets.get(.geminiAPIKey), !apiKey.isEmpty else {
            throw LexisError.missingAPIKey(service: "Gemini")
        }
        let url = URL(string: "https://generativelanguage.googleapis.com/v1beta/models/\(model):generateContent")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(apiKey, forHTTPHeaderField: "x-goog-api-key")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        return try await RetryPolicy.withRetry(serviceName: "Gemini") {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else {
                throw LexisError.httpFailure(service: "Gemini", status: -1, body: "")
            }
            guard (200...299).contains(http.statusCode) else {
                if http.statusCode == 429 { throw RetryableError.rateLimited }
                let bodyText = String(data: data, encoding: .utf8) ?? ""
                throw LexisError.httpFailure(service: "Gemini", status: http.statusCode, body: bodyText)
            }
            struct GenerateContentResponse: Decodable {
                struct Candidate: Decodable {
                    struct Content: Decodable {
                        struct Part: Decodable { let text: String? }
                        let parts: [Part]
                    }
                    let content: Content
                }
                let candidates: [Candidate]
            }
            let decoded: GenerateContentResponse
            do {
                decoded = try JSONDecoder().decode(GenerateContentResponse.self, from: data)
            } catch {
                throw LexisError.decodingFailure(service: "Gemini", underlying: error.localizedDescription)
            }
            guard let text = decoded.candidates.first?.content.parts.first?.text else {
                throw LexisError.decodingFailure(service: "Gemini", underlying: "no candidates in response")
            }
            return text
        }
    }
}
