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
        do {
            let result = try await translateViaGoogle(text, to: language)
            if !result.isEmpty { return result }
        } catch {
            // Fall through to Gemini; the google-specific failure reason is
            // still useful if Gemini also fails and has no key configured.
        }
        return try await gemini.translate(text, to: language.displayName, model: model)
    }

    private func translateViaGoogle(_ text: String, to language: TargetLanguage) async throws -> String {
        var components = URLComponents(string: "https://translate.googleapis.com/translate_a/single")
        components?.queryItems = [
            URLQueryItem(name: "client", value: "gtx"),
            // Auto-detect the source language instead of assuming English -
            // this endpoint was previously hardcoded to sl=en, which silently
            // mistranslated any non-English source document's text.
            URLQueryItem(name: "sl", value: "auto"),
            URLQueryItem(name: "tl", value: language.code),
            URLQueryItem(name: "dt", value: "t"),
            URLQueryItem(name: "q", value: text),
        ]
        guard let url = components?.url else {
            throw LexumeError.decodingFailure(service: "Translate", underlying: "invalid URL")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        // This unofficial endpoint rejects requests with no User-Agent (or a
        // clearly non-browser one) — this was the actual bug: the previous
        // POST-with-form-body version, missing this header, never got a
        // usable response back.
        request.setValue(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
            forHTTPHeaderField: "User-Agent"
        )

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            let status = (response as? HTTPURLResponse)?.statusCode ?? -1
            let bodyText = String(data: data, encoding: .utf8) ?? ""
            throw LexumeError.httpFailure(service: "Translate", status: status, body: bodyText)
        }

        // Response shape: [[[translatedChunk, originalChunk, ...], ...], ...]
        // — reconstruct the full translation by joining each chunk's first element.
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [Any],
              let segments = json.first as? [Any]
        else {
            throw LexumeError.decodingFailure(service: "Translate", underlying: "unexpected response shape")
        }

        var result = ""
        for segment in segments {
            if let pair = segment as? [Any], let piece = pair.first as? String {
                result += piece
            }
        }
        guard !result.isEmpty else {
            throw LexumeError.decodingFailure(service: "Translate", underlying: "empty translation")
        }
        return result
    }
}
