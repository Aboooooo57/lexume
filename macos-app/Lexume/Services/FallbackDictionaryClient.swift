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
        if let entry = try? await primary.define(word) {
            return entry
        }
        guard secrets.get(.geminiAPIKey) != nil else { return nil }
        let model = UserDefaults.standard.string(forKey: AppSettings.geminiModelKey) ?? AppSettings.defaultGeminiModel
        return try? await gemini.defineWord(word, model: model)
    }
}
