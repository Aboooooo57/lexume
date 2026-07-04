import AppKit
import Foundation

/// The no-Gemini-key extraction path: reads PDFs and photos entirely
/// on-device via Vision/VisionKit OCR, free and offline. There's no AI
/// available to clean the result up, so text passes through close to raw —
/// paragraph breaks come from the OCR engine's own line grouping.
struct LocalExtractionService: ExtractionService {
    var engine: OCREngine

    func extractPDFPage(_ pdfData: Data, model: String) async throws -> ExtractedPage {
        guard let image = PDFPageExtractor.renderImage(fromSinglePagePDF: pdfData) else {
            throw LexisError.decodingFailure(service: "On-device OCR", underlying: "couldn't render the page for OCR")
        }
        let text = try await engine.service.recognizeText(in: image)
        return ExtractedPage(title: Self.deriveTitle(from: text), text: text)
    }

    func extractImage(_ imageData: Data, mimeType: String, model: String) async throws -> ExtractedPage {
        guard let nsImage = NSImage(data: imageData),
              let cgImage = nsImage.cgImage(forProposedRect: nil, context: nil, hints: nil)
        else {
            throw LexisError.decodingFailure(service: "On-device OCR", underlying: "couldn't decode the image")
        }
        let text = try await engine.service.recognizeText(in: cgImage)
        return ExtractedPage(title: Self.deriveTitle(from: text), text: text)
    }

    func reformat(text: String, model: String) async throws -> ExtractedPage {
        // No AI available offline — pass pasted/plain-text sources through unchanged.
        ExtractedPage(title: Self.deriveTitle(from: text), text: text)
    }

    func keyTerms(in paragraph: String, model: String, maxTerms: Int) async throws -> [String] {
        // Picking dictionary-worthy words needs Gemini; nothing sensible offline.
        []
    }

    private static func deriveTitle(from text: String) -> String {
        let firstLine = text.split(separator: "\n").first.map(String.init) ?? ""
        let trimmed = firstLine.trimmingCharacters(in: .whitespaces)
        return trimmed.isEmpty ? "Scanned Page" : String(trimmed.prefix(60))
    }
}
