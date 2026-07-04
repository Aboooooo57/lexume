import AppKit
import CoreGraphics
import VisionKit

/// The same Live Text engine behind Preview/Quick Look's "Copy text from
/// image." Higher-level than raw Vision — its .transcript already groups
/// lines into paragraphs reasonably, since that's what Live Text is built to do.
struct VisionKitOCRService: OCRService {
    func recognizeText(in image: CGImage) async throws -> String {
        let analyzer = ImageAnalyzer()
        let configuration = ImageAnalyzer.Configuration([.text])
        let nsImage = NSImage(cgImage: image, size: NSSize(width: image.width, height: image.height))
        let analysis = try await analyzer.analyze(nsImage, configuration: configuration)
        return analysis.transcript
    }
}
