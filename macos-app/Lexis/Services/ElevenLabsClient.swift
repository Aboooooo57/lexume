import Foundation

struct VoiceTuning: Sendable {
    var stability: Double
    var similarityBoost: Double
    var style: Double
    var speed: Double
}

struct Voice: Sendable, Identifiable, Hashable {
    var id: String
    var name: String
}

protocol SpeechService: Sendable {
    func synthesize(text: String, voiceID: String, model: String, settings: VoiceTuning) async throws -> (audio: Data, timings: [WordTiming])
    func voices() async throws -> [Voice]
}

/// Talks to the ElevenLabs REST API directly (no SDK).
struct ElevenLabsClient: SpeechService {
    private let secrets: SecretsStore

    init(secrets: SecretsStore = KeychainStore()) {
        self.secrets = secrets
    }

    func synthesize(text: String, voiceID: String, model: String, settings: VoiceTuning) async throws -> (audio: Data, timings: [WordTiming]) {
        guard let apiKey = secrets.get(.elevenLabsAPIKey), !apiKey.isEmpty else {
            throw LexisError.missingAPIKey(service: "ElevenLabs")
        }
        guard let url = URL(string: "https://api.elevenlabs.io/v1/text-to-speech/\(voiceID)/with-timestamps?output_format=mp3_44100_128") else {
            throw LexisError.decodingFailure(service: "ElevenLabs", underlying: "invalid voice ID")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(apiKey, forHTTPHeaderField: "xi-api-key")
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "text": text,
            "model_id": model,
            "voice_settings": [
                "stability": settings.stability,
                "similarity_boost": settings.similarityBoost,
                "style": settings.style,
                "speed": settings.speed,
                "use_speaker_boost": true,
            ],
        ])

        let data = try await RetryPolicy.withRetry(serviceName: "ElevenLabs") {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else {
                throw LexisError.httpFailure(service: "ElevenLabs", status: -1, body: "")
            }
            guard (200...299).contains(http.statusCode) else {
                if http.statusCode == 429 { throw RetryableError.rateLimited }
                let bodyText = String(data: data, encoding: .utf8) ?? ""
                throw LexisError.httpFailure(service: "ElevenLabs", status: http.statusCode, body: bodyText)
            }
            return data
        }

        struct Alignment: Decodable {
            let characters: [String]
            let character_start_times_seconds: [Double]
            let character_end_times_seconds: [Double]
        }
        struct Response: Decodable {
            let audio_base64: String
            let alignment: Alignment?
        }

        let decoded: Response
        do {
            decoded = try JSONDecoder().decode(Response.self, from: data)
        } catch {
            throw LexisError.decodingFailure(service: "ElevenLabs", underlying: error.localizedDescription)
        }
        guard let audioData = Data(base64Encoded: decoded.audio_base64) else {
            throw LexisError.decodingFailure(service: "ElevenLabs", underlying: "invalid base64 audio")
        }

        let timings = Self.charsToWords(
            characters: decoded.alignment?.characters ?? [],
            starts: decoded.alignment?.character_start_times_seconds ?? [],
            ends: decoded.alignment?.character_end_times_seconds ?? []
        )
        return (audioData, timings)
    }

    func voices() async throws -> [Voice] {
        guard let apiKey = secrets.get(.elevenLabsAPIKey), !apiKey.isEmpty else {
            throw LexisError.missingAPIKey(service: "ElevenLabs")
        }
        var request = URLRequest(url: URL(string: "https://api.elevenlabs.io/v1/voices")!)
        request.httpMethod = "GET"
        request.setValue(apiKey, forHTTPHeaderField: "xi-api-key")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            let status = (response as? HTTPURLResponse)?.statusCode ?? -1
            let bodyText = String(data: data, encoding: .utf8) ?? ""
            throw LexisError.httpFailure(service: "ElevenLabs", status: status, body: bodyText)
        }

        struct VoicesResponse: Decodable {
            struct VoiceEntry: Decodable {
                let voice_id: String
                let name: String
            }
            let voices: [VoiceEntry]
        }
        do {
            let decoded = try JSONDecoder().decode(VoicesResponse.self, from: data)
            return decoded.voices.map { Voice(id: $0.voice_id, name: $0.name) }
        } catch {
            throw LexisError.decodingFailure(service: "ElevenLabs", underlying: error.localizedDescription)
        }
    }

    /// Ports backend/api/utils.py's _chars_to_words verbatim: any whitespace
    /// is a boundary; a word's start is its first character's start time, its
    /// end is its last character's end time.
    static func charsToWords(characters: [String], starts: [Double], ends: [Double]) -> [WordTiming] {
        var words: [WordTiming] = []
        var currentChars: [String] = []
        var currentStart: Double?
        var currentEnd: Double = 0

        let count = min(characters.count, starts.count, ends.count)
        for index in 0..<count {
            let char = characters[index]
            let isWhitespace = char.rangeOfCharacter(from: .whitespacesAndNewlines) != nil
            if isWhitespace {
                if !currentChars.isEmpty {
                    words.append(WordTiming(word: currentChars.joined(), start: currentStart ?? 0, end: currentEnd))
                    currentChars = []
                    currentStart = nil
                }
            } else {
                if currentStart == nil { currentStart = starts[index] }
                currentChars.append(char)
                currentEnd = ends[index]
            }
        }
        if !currentChars.isEmpty {
            words.append(WordTiming(word: currentChars.joined(), start: currentStart ?? 0, end: currentEnd))
        }
        return words
    }
}
