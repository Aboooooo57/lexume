import Foundation

protocol TranslationService: Sendable {
    func translate(_ text: String, to language: TargetLanguage, preferGemini: Bool) async throws -> String
}

/// Free, keyless primary engine (Google's unofficial "gtx" endpoint, same one
/// the reference backend uses) with a Gemini fallback for accuracy or when
/// the free endpoint fails.
struct GoogleTranslateClient: TranslationService {
    private let gemini: GeminiClient

    init(gemini: GeminiClient = GeminiClient()) {
        self.gemini = gemini
    }

    func translate(_ text: String, to language: TargetLanguage, preferGemini: Bool) async throws -> String {
        let model = UserDefaults.standard.string(forKey: AppSettings.geminiModelKey) ?? AppSettings.defaultGeminiModel

        if preferGemini {
            return try await gemini.translate(text, to: language.displayName, model: model)
        }
        if let result = try? await translateViaGoogle(text, to: language), !result.isEmpty {
            return result
        }
        return try await gemini.translate(text, to: language.displayName, model: model)
    }

    private func translateViaGoogle(_ text: String, to language: TargetLanguage) async throws -> String {
        var components = URLComponents(string: "https://translate.googleapis.com/translate_a/single")
        components?.queryItems = [
            URLQueryItem(name: "client", value: "gtx"),
            URLQueryItem(name: "sl", value: "en"),
            URLQueryItem(name: "tl", value: language.code),
            URLQueryItem(name: "dt", value: "t"),
        ]
        guard let url = components?.url else {
            throw LexisError.decodingFailure(service: "Translate", underlying: "invalid URL")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        let encodedText = text.addingPercentEncoding(withAllowedCharacters: .urlQueryValueAllowed) ?? text
        request.httpBody = "q=\(encodedText)".data(using: .utf8)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            let status = (response as? HTTPURLResponse)?.statusCode ?? -1
            throw LexisError.httpFailure(service: "Translate", status: status, body: "")
        }

        // Response shape: [[[translatedChunk, originalChunk, ...], ...], ...]
        // — reconstruct the full translation by joining each chunk's first element.
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [Any],
              let segments = json.first as? [Any]
        else {
            throw LexisError.decodingFailure(service: "Translate", underlying: "unexpected response shape")
        }

        var result = ""
        for segment in segments {
            if let pair = segment as? [Any], let piece = pair.first as? String {
                result += piece
            }
        }
        guard !result.isEmpty else {
            throw LexisError.decodingFailure(service: "Translate", underlying: "empty translation")
        }
        return result
    }
}

private extension CharacterSet {
    /// Percent-encode everything a query value needs, including & and + which
    /// .urlQueryAllowed leaves unescaped (they'd otherwise corrupt form-encoded bodies).
    static let urlQueryValueAllowed: CharacterSet = {
        var set = CharacterSet.urlQueryAllowed
        set.remove(charactersIn: "&+=")
        return set
    }()
}
