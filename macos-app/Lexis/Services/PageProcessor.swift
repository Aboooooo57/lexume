import Foundation
import SwiftData

private struct PageKey: Hashable, Sendable {
    let sessionID: PersistentIdentifier
    let pageNumber: Int
}

/// Lazily extracts and caches page text, deduplicating concurrent requests
/// for the same page — mirrors the reference backend's per-page asyncio locks.
actor PageProcessor {
    nonisolated let persistence: PersistenceActor
    private let extraction: ExtractionService
    private var inflight: [PageKey: Task<PageSnapshot, Error>] = [:]

    init(container: ModelContainer, extraction: ExtractionService) {
        self.persistence = PersistenceActor(modelContainer: container)
        self.extraction = extraction
    }

    /// Returns the cached page if present; otherwise extracts it via Gemini and caches the result.
    func textPage(sessionID: PersistentIdentifier, pageNumber: Int, model: String) async throws -> PageSnapshot {
        let key = PageKey(sessionID: sessionID, pageNumber: pageNumber)
        if let existing = inflight[key] {
            return try await existing.value
        }

        let persistence = persistence
        let extraction = extraction
        let task = Task<PageSnapshot, Error> {
            if let cached = try await persistence.page(sessionID, number: pageNumber),
               let text = cached.extractedText, !text.isEmpty {
                return cached
            }
            guard let overview = try await persistence.overview(sessionID) else {
                throw LexisError.notFound("Session")
            }

            let extracted: ExtractedPage
            if overview.sourceType == "pdf" {
                guard let originalDocument = overview.originalDocument,
                      pageNumber >= 1, pageNumber <= overview.selectedPageIndices.count,
                      let pdfPageData = PDFPageExtractor.singlePagePDFData(
                        pageIndex: overview.selectedPageIndices[pageNumber - 1],
                        in: originalDocument
                      )
                else {
                    throw LexisError.notFound("Page \(pageNumber)")
                }
                extracted = try await extraction.extractPDFPage(pdfPageData, model: model)
            } else {
                extracted = try await extraction.reformat(text: overview.rawSourceText ?? "", model: model)
            }

            try await persistence.saveExtractedPage(sessionID, number: pageNumber, title: extracted.title, text: extracted.text)
            guard let saved = try await persistence.page(sessionID, number: pageNumber) else {
                throw LexisError.notFound("Page \(pageNumber)")
            }
            return saved
        }

        inflight[key] = task
        defer { inflight[key] = nil }
        return try await task.value
    }
}
