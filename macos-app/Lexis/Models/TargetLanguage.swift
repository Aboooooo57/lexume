import Foundation

struct TargetLanguage: Sendable, Equatable {
    var displayName: String
    var code: String
    var isRTL: Bool

    static let all: [TargetLanguage] = [
        TargetLanguage(displayName: "Persian", code: "fa", isRTL: true),
        TargetLanguage(displayName: "Spanish", code: "es", isRTL: false),
        TargetLanguage(displayName: "French", code: "fr", isRTL: false),
        TargetLanguage(displayName: "German", code: "de", isRTL: false),
        TargetLanguage(displayName: "Chinese", code: "zh-CN", isRTL: false),
        TargetLanguage(displayName: "Japanese", code: "ja", isRTL: false),
        TargetLanguage(displayName: "Russian", code: "ru", isRTL: false),
        TargetLanguage(displayName: "Arabic", code: "ar", isRTL: true),
        TargetLanguage(displayName: "Turkish", code: "tr", isRTL: false),
        TargetLanguage(displayName: "Italian", code: "it", isRTL: false),
    ]

    static func named(_ name: String) -> TargetLanguage {
        all.first(where: { $0.displayName == name }) ?? all[0]
    }
}
