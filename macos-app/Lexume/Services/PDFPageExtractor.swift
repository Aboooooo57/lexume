import Foundation
import PDFKit

enum PDFPageExtractor {
    static func pageCount(of data: Data) -> Int {
        PDFDocument(data: data)?.pageCount ?? 0
    }

    static func thumbnail(pageIndex: Int, in data: Data, size: CGSize) -> PlatformImage? {
        guard let document = PDFDocument(data: data), let page = document.page(at: pageIndex) else {
            return nil
        }
        return page.thumbnail(of: size, for: .mediaBox)
    }

    /// Builds a standalone single-page PDF, suitable for sending inline to Gemini —
    /// smaller than uploading the whole document and needs no page-focus prompt.
    static func singlePagePDFData(pageIndex: Int, in data: Data) -> Data? {
        guard let source = PDFDocument(data: data), let page = source.page(at: pageIndex) else {
            return nil
        }
        let target = PDFDocument()
        target.insert(page, at: 0)
        return target.dataRepresentation()
    }

    /// Rasterizes a single-page PDF (as produced by singlePagePDFData) at a
    /// resolution suitable for on-device OCR.
    static func renderImage(fromSinglePagePDF data: Data, maxDimension: CGFloat = 2200) -> CGImage? {
        guard let document = PDFDocument(data: data), let page = document.page(at: 0) else {
            return nil
        }
        let bounds = page.bounds(for: .mediaBox)
        guard bounds.width > 0, bounds.height > 0 else { return nil }
        let scale = maxDimension / max(bounds.width, bounds.height)
        let size = CGSize(width: max(1, bounds.width * scale), height: max(1, bounds.height * scale))
        let rendered = page.thumbnail(of: size, for: .mediaBox)
        return rendered.platformCGImage
    }
}
