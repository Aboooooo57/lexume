import Foundation

/// Falls back to a Gemini-generated entry when the free dictionaryapi.dev
/// (English-only) has nothing for a word - covers non-English words from a
/// non-English source document, as well as obscure English words the free
/// dictionary's database doesn't have. Skipped entirely (behaves exactly
/// like the free dictionary alone) when no Gemini key is configured, so
/// this changes nothing for anyone not using Gemini.
struct FallbackDictionaryClient: DictionaryService {
    private let primary: DictionaryService
    private let gemini: GeminiClient
    private let secrets: SecretsStore

    init(
        primary: DictionaryService = FreeDictionaryClient(),
        gemini: GeminiClient = GeminiClient(),
        secrets: SecretsStore = KeychainStore()
    ) {
        self.primary = primary
        self.gemini = gemini
        self.secrets = secrets
    }

    func define(_ word: String) async throws -> DictionaryEntry? {
        // `primary` throwing (network failure, HTTP error, a decoding
        // mismatch) is a real problem, distinct from it succeeding but
        // legitimately having nothing for this word - conflating the two
        // (the old `try?` here did) meant any actual error silently
        // repainted itself as "No definition found for X" in the UI,
        // burying the real cause. Only a genuine miss falls through to
        // Gemini; a real failure is remembered and, if Gemini can't rescue
        // it either, surfaces to the caller instead of vanishing.
        var primaryError: Error?
        do {
            if let entry = try await primary.define(word) {
                return entry
            }
        } catch {
            primaryError = error
        }

        guard secrets.get(.geminiAPIKey) != nil else {
            if let primaryError { throw primaryError }
            return nil
        }
        let model = UserDefaults.standard.string(forKey: AppSettings.geminiModelKey) ?? AppSettings.defaultGeminiModel
        do {
            return try await gemini.defineWord(word, model: model)
        } catch {
            // The free dictionary's own failure (if any) is more
            // informative than "Gemini also didn't work" when both failed.
            throw primaryError ?? error
        }
    }
}
