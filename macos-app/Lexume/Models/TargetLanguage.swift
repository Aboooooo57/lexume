import Foundation

struct TargetLanguage: Sendable, Equatable {
    var displayName: String
    var code: String
    var isRTL: Bool

    /// Persian stays first (the existing default). The rest cover most of
    /// what Google Translate/Gemini actually support — the original list of
    /// 10 was just an arbitrary carryover from the web app's scope, not a
    /// technical limit.
    static let all: [TargetLanguage] = [
        TargetLanguage(displayName: "Persian", code: "fa", isRTL: true),
        TargetLanguage(displayName: "Spanish", code: "es", isRTL: false),
        TargetLanguage(displayName: "French", code: "fr", isRTL: false),
        TargetLanguage(displayName: "German", code: "de", isRTL: false),
        TargetLanguage(displayName: "Chinese (Simplified)", code: "zh-CN", isRTL: false),
        TargetLanguage(displayName: "Chinese (Traditional)", code: "zh-TW", isRTL: false),
        TargetLanguage(displayName: "Japanese", code: "ja", isRTL: false),
        TargetLanguage(displayName: "Korean", code: "ko", isRTL: false),
        TargetLanguage(displayName: "Russian", code: "ru", isRTL: false),
        TargetLanguage(displayName: "Arabic", code: "ar", isRTL: true),
        TargetLanguage(displayName: "Turkish", code: "tr", isRTL: false),
        TargetLanguage(displayName: "Italian", code: "it", isRTL: false),
        TargetLanguage(displayName: "Portuguese", code: "pt", isRTL: false),
        TargetLanguage(displayName: "Dutch", code: "nl", isRTL: false),
        TargetLanguage(displayName: "Polish", code: "pl", isRTL: false),
        TargetLanguage(displayName: "Swedish", code: "sv", isRTL: false),
        TargetLanguage(displayName: "Norwegian", code: "no", isRTL: false),
        TargetLanguage(displayName: "Danish", code: "da", isRTL: false),
        TargetLanguage(displayName: "Finnish", code: "fi", isRTL: false),
        TargetLanguage(displayName: "Greek", code: "el", isRTL: false),
        TargetLanguage(displayName: "Hebrew", code: "he", isRTL: true),
        TargetLanguage(displayName: "Hindi", code: "hi", isRTL: false),
        TargetLanguage(displayName: "Urdu", code: "ur", isRTL: true),
        TargetLanguage(displayName: "Bengali", code: "bn", isRTL: false),
        TargetLanguage(displayName: "Vietnamese", code: "vi", isRTL: false),
        TargetLanguage(displayName: "Thai", code: "th", isRTL: false),
        TargetLanguage(displayName: "Indonesian", code: "id", isRTL: false),
        TargetLanguage(displayName: "Malay", code: "ms", isRTL: false),
        TargetLanguage(displayName: "Filipino", code: "tl", isRTL: false),
        TargetLanguage(displayName: "Ukrainian", code: "uk", isRTL: false),
        TargetLanguage(displayName: "Czech", code: "cs", isRTL: false),
        TargetLanguage(displayName: "Romanian", code: "ro", isRTL: false),
        TargetLanguage(displayName: "Hungarian", code: "hu", isRTL: false),
        TargetLanguage(displayName: "Swahili", code: "sw", isRTL: false),
        TargetLanguage(displayName: "Pashto", code: "ps", isRTL: true),
        TargetLanguage(displayName: "Kurdish (Sorani)", code: "ckb", isRTL: true),
    ]

    static func named(_ name: String) -> TargetLanguage {
        all.first(where: { $0.displayName == name }) ?? all[0]
    }
}
