import Foundation

/// UserDefaults keys and defaults shared by views via @AppStorage.
/// (Secrets never live here — see KeychainStore.)
enum AppSettings {
    // Models
    static let geminiModelKey = "geminiModel"
    static let defaultGeminiModel = "gemini-3.5-flash"

    static let elevenModelKey = "elevenModel"
    static let defaultElevenModel = "eleven_multilingual_v2"

    static let voiceIDKey = "voiceID"
    static let defaultVoiceID = "JBFqnCBsd6RMkjVDRZzb"

    // Voice tuning
    static let stabilityKey = "voiceStability"          // 0...1, default 0.5
    static let similarityBoostKey = "voiceSimilarity"   // 0...1, default 0.75
    static let styleKey = "voiceStyle"                  // 0...1, default 0.0
    static let speedKey = "voiceSpeed"                  // 0.5...2, default 1.0

    // Reading
    static let readingThemeKey = "readingTheme"         // system | light | dark | sepia
    static let fontFamilyKey = "readerFontFamily"       // sans | serif | mono
    static let fontSizeKey = "readerFontSize"           // points, default 18

    // Translation
    static let targetLanguageKey = "targetLanguage"     // display name, default Persian
    static let translationEngineKey = "translationEngine" // google | gemini

    // Audio behavior
    static let audioModeKey = "audioMode"               // auto | manual | off

    // On-device OCR (used automatically in place of Gemini when no key is set)
    static let ocrEngineKey = "ocrEngine"                // vision | visionKit
    static let defaultOCREngine = "vision"

    // Google Drive backup (OAuth client credentials are baked in — see DriveOAuthConfig)
    static let driveLastBackupKey = "driveLastBackupDate" // ISO 8601 string

    // Guided tour (kept out of allKeys, same as onboarding's implicit state — "Reset to Defaults" shouldn't force it to reappear)
    static let hasSeenGuidedTourKey = "hasSeenGuidedTour"

    /// Every @AppStorage-backed preference key, for "Reset to Defaults".
    /// (Keychain secrets are separate and untouched by a reset.)
    static let allKeys: [String] = [
        geminiModelKey, elevenModelKey, voiceIDKey,
        stabilityKey, similarityBoostKey, styleKey, speedKey,
        readingThemeKey, fontFamilyKey, fontSizeKey,
        targetLanguageKey, translationEngineKey,
        audioModeKey, ocrEngineKey,
    ]

    static func resetAllToDefaults() {
        let defaults = UserDefaults.standard
        for key in allKeys {
            defaults.removeObject(forKey: key)
        }
    }
}
