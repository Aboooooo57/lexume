import Foundation

/// Cheap authenticated GETs used by the "Test key" buttons in onboarding/settings.
enum KeyValidator {
    enum Result: Equatable {
        case valid
        case invalid(String)
    }

    static func testGeminiKey(_ key: String) async -> Result {
        var request = URLRequest(url: URL(string: "https://generativelanguage.googleapis.com/v1beta/models")!)
        request.httpMethod = "GET"
        request.setValue(key, forHTTPHeaderField: "x-goog-api-key")
        return await perform(request, serviceName: "Gemini")
    }

    static func testElevenLabsKey(_ key: String) async -> Result {
        var request = URLRequest(url: URL(string: "https://api.elevenlabs.io/v1/user")!)
        request.httpMethod = "GET"
        request.setValue(key, forHTTPHeaderField: "xi-api-key")
        return await perform(request, serviceName: "ElevenLabs")
    }

    private static func perform(_ request: URLRequest, serviceName: String) async -> Result {
        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else {
                return .invalid("Unexpected response from \(serviceName).")
            }
            switch http.statusCode {
            case 200: return .valid
            case 401, 403: return .invalid("\(serviceName) rejected this key.")
            case 429: return .invalid("\(serviceName) is rate-limiting; the key may still be valid — try again in a minute.")
            default: return .invalid("\(serviceName) returned HTTP \(http.statusCode).")
            }
        } catch {
            return .invalid("Network error: \(error.localizedDescription)")
        }
    }
}
