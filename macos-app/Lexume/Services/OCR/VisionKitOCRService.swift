import CoreGraphics
import VisionKit

/// The same Live Text engine behind Preview/Quick Look's "Copy text from
/// image." Higher-level than raw Vision — its .transcript already groups
/// lines into paragraphs reasonably, since that's what Live Text is built to do.
struct VisionKitOCRService: OCRService {
    func recognizeText(in image: CGImage) async throws -> String {
        let analyzer = ImageAnalyzer()
        let configuration = ImageAnalyzer.Configuration([.text])
        let platformImage = PlatformImage(platformCGImage: image)
        // .up: images we pass in (rendered PDF pages, decoded photos) are
        // already right-side-up with no EXIF rotation to account for.
        let analysis = try await analyzer.analyze(platformImage, orientation: .up, configuration: configuration)
        return analysis.transcript
    }
}
