import CoreGraphics
import Foundation
import PDFKit
import SwiftData

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

    /// Same as `singlePagePDFData(pageIndex:in:)` but reuses an already-parsed
    /// document, so a 300-page PDF isn't re-parsed for every page that's read.
    static func singlePagePDFData(pageIndex: Int, in document: PDFDocument) -> Data? {
        guard let page = document.page(at: pageIndex) else { return nil }
        let target = PDFDocument()
        target.insert(page, at: 0)
        return target.dataRepresentation()
    }

    /// Word boxes read straight from the PDF's own text layer — what Preview
    /// uses — so no OCR is needed for PDFs that already contain text.
    /// Returns nil when the page has no usable text layer (scans, photos in a
    /// PDF) or is rotated, so the caller falls back to OCR. Boxes use the same
    /// normalized, bottom-left-origin coordinates as Vision, relative to the
    /// media box that `renderImage(page:)` rasterizes.
    static func textLayerWordBoxes(page: PDFPage) -> [WordBox]? {
        guard page.rotation == 0, let text = page.string else { return nil }
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 20 else { return nil }
        let media = page.bounds(for: .mediaBox)
        guard media.width > 0, media.height > 0 else { return nil }

        let nsText = text as NSString
        var boxes: [WordBox] = []
        nsText.enumerateSubstrings(in: NSRange(location: 0, length: nsText.length), options: .byWords) { word, range, _, _ in
            guard let word, !word.isEmpty,
                  let selection = page.selection(for: range) else { return }
            let rect = selection.bounds(for: page)
            guard rect.width > 0, rect.height > 0 else { return }
            let normalized = CGRect(
                x: (rect.minX - media.minX) / media.width,
                y: (rect.minY - media.minY) / media.height,
                width: rect.width / media.width,
                height: rect.height / media.height
            ).intersection(CGRect(x: 0, y: 0, width: 1, height: 1))
            guard !normalized.isNull, normalized.width > 0, normalized.height > 0 else { return }
            boxes.append(WordBox(word: word, boundingBox: normalized))
        }
        // A handful of boxes means the "text" is stray metadata, not the page.
        return boxes.count >= 5 ? boxes : nil
    }

    /// Rasterizes a single-page PDF (as produced by singlePagePDFData) at a
    /// resolution suitable for on-device OCR.
    static func renderImage(fromSinglePagePDF data: Data, maxDimension: CGFloat = 2200) -> CGImage? {
        guard let document = PDFDocument(data: data), let page = document.page(at: 0) else {
            return nil
        }
        return renderImage(page: page, maxDimension: maxDimension)
    }

    /// Rasterizes a page directly. The single-page-PDF overload above routes
    /// through here, so display and OCR renderings stay pixel-identical.
    static func renderImage(page: PDFPage, maxDimension: CGFloat = 2200) -> CGImage? {
        let bounds = page.bounds(for: .mediaBox)
        guard bounds.width > 0, bounds.height > 0 else { return nil }
        let scale = maxDimension / max(bounds.width, bounds.height)
        let size = CGSize(width: max(1, bounds.width * scale), height: max(1, bounds.height * scale))
        let rendered = page.thumbnail(of: size, for: .mediaBox)
        return rendered.platformCGImage
    }
}

/// Keeps each session's parsed `PDFDocument` in memory so reading page N
/// doesn't re-read and re-parse the whole file. PDFKit documents aren't
/// thread-safe, so every use goes through `withDocument`, which holds a lock.
final class PDFDocumentCache: @unchecked Sendable {
    private let lock = NSLock()
    private var documents: [PersistentIdentifier: PDFDocument] = [:]

    func contains(_ id: PersistentIdentifier) -> Bool {
        lock.lock(); defer { lock.unlock() }
        return documents[id] != nil
    }

    /// Parses `data` and stores it unless this session is already cached.
    @discardableResult
    func prime(_ id: PersistentIdentifier, data: Data) -> Bool {
        if contains(id) { return true }
        guard let document = PDFDocument(data: data) else { return false }
        lock.lock(); defer { lock.unlock() }
        if documents[id] == nil { documents[id] = document }
        return true
    }

    func withDocument<T>(_ id: PersistentIdentifier, _ body: (PDFDocument) -> T?) -> T? {
        lock.lock(); defer { lock.unlock() }
        guard let document = documents[id] else { return nil }
        return body(document)
    }
}
