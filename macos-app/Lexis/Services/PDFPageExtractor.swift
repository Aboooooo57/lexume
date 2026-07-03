import Foundation
import PDFKit
import AppKit

enum PDFPageExtractor {
    static func pageCount(of data: Data) -> Int {
        PDFDocument(data: data)?.pageCount ?? 0
    }

    static func thumbnail(pageIndex: Int, in data: Data, size: CGSize) -> NSImage? {
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
}
