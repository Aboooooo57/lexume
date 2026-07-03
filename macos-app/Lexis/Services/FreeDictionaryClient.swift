import Foundation

protocol DictionaryService: Sendable {
    func define(_ word: String) async throws -> DictionaryEntry?
}

/// Small in-memory cache so repeated lookups of the same word (common when
/// following synonyms back and forth) don't keep hitting the network.
actor DictionaryCache {
    static let shared = DictionaryCache()
    private var storage: [String: DictionaryEntry] = [:]

    func get(_ word: String) -> DictionaryEntry? { storage[word] }
    func set(_ word: String, entry: DictionaryEntry) { storage[word] = entry }
}

/// Free, keyless proxy: https://dictionaryapi.dev
struct FreeDictionaryClient: DictionaryService {
    func define(_ word: String) async throws -> DictionaryEntry? {
        let cleaned = word.lowercased()
        if let cached = await DictionaryCache.shared.get(cleaned) {
            return cached
        }
        guard let encoded = cleaned.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed),
              let url = URL(string: "https://api.dictionaryapi.dev/api/v2/entries/en/\(encoded)")
        else {
            return nil
        }

        let (data, response) = try await URLSession.shared.data(from: url)
        guard let http = response as? HTTPURLResponse else {
            throw LexisError.httpFailure(service: "Dictionary", status: -1, body: "")
        }
        if http.statusCode == 404 {
            return nil
        }
        guard (200...299).contains(http.statusCode) else {
            let bodyText = String(data: data, encoding: .utf8) ?? ""
            throw LexisError.httpFailure(service: "Dictionary", status: http.statusCode, body: bodyText)
        }

        do {
            let entries = try JSONDecoder().decode([DictionaryEntry].self, from: data)
            guard let first = entries.first else { return nil }
            await DictionaryCache.shared.set(cleaned, entry: first)
            return first
        } catch {
            throw LexisError.decodingFailure(service: "Dictionary", underlying: error.localizedDescription)
        }
    }
}
