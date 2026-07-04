import Foundation

/// Picks the extraction backend automatically: Gemini when a key is
/// configured, otherwise the on-device OCR engine chosen in Settings.
enum ExtractionServiceFactory {
    static func make(secrets: SecretsStore = KeychainStore()) -> ExtractionService {
        if let key = secrets.get(.geminiAPIKey), !key.isEmpty {
            return GeminiClient(secrets: secrets)
        }
        let engineRaw = UserDefaults.standard.string(forKey: AppSettings.ocrEngineKey) ?? AppSettings.defaultOCREngine
        let engine = OCREngine(rawValue: engineRaw) ?? .vision
        return LocalExtractionService(engine: engine)
    }
}
