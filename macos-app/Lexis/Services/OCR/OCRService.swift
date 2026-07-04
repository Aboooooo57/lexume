import CoreGraphics
import Foundation

/// On-device text recognition, used when no Gemini key is configured — the
/// same category of feature as Preview/Quick Look's Live Text, running
/// entirely locally with no network call and no API key.
protocol OCRService: Sendable {
    func recognizeText(in image: CGImage) async throws -> String
}

enum OCREngine: String, CaseIterable, Sendable {
    case vision
    case visionKit

    var displayName: String {
        switch self {
        case .vision: return "Vision framework (VNRecognizeTextRequest)"
        case .visionKit: return "VisionKit (Live Text)"
        }
    }

    var service: OCRService {
        switch self {
        case .vision: return VisionOCRService()
        case .visionKit: return VisionKitOCRService()
        }
    }
}
