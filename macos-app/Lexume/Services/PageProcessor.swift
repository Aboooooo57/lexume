import CoreGraphics
import Foundation
import PDFKit
import SwiftData

private struct PageKey: Hashable, Sendable {
    let sessionID: PersistentIdentifier
    let pageNumber: Int
}

struct AudioResult: Sendable {
    var audioData: Data
    var timings: [WordTiming]
}

/// Lazily extracts and caches page text/audio, deduplicating concurrent
/// requests for the same page — mirrors the reference backend's per-page
/// asyncio locks. Text and audio are independent stages, each with their own
/// dedup table, matching the backend's two-stage pipeline.
actor PageProcessor {
    nonisolated let persistence: PersistenceActor
    nonisolated let pdfCache = PDFDocumentCache()
    private let extraction: ExtractionService
    private let speech: SpeechService
    private var inflightText: [PageKey: Task<PageSnapshot, Error>] = [:]
    private var inflightAudio: [PageKey: Task<AudioResult, Error>] = [:]
    private var inflightLayout: [PageKey: Task<[WordBox], Error>] = [:]

    init(container: ModelContainer, extraction: ExtractionService, speech: SpeechService) {
        self.persistence = PersistenceActor(modelContainer: container)
        self.extraction = extraction
        self.speech = speech
    }

    /// Returns the cached page if present; otherwise extracts it and caches the result.
    func textPage(sessionID: PersistentIdentifier, pageNumber: Int, model: String) async throws -> PageSnapshot {
        let key = PageKey(sessionID: sessionID, pageNumber: pageNumber)
        if let existing = inflightText[key] {
            return try await existing.value
        }

        let persistence = persistence
        let extraction = extraction
        let pdfCache = pdfCache
        let task = Task<PageSnapshot, Error> {
            if let cached = try await persistence.page(sessionID, number: pageNumber),
               let text = cached.extractedText, !text.isEmpty {
                return cached
            }
            guard let overview = try await persistence.overview(sessionID, includeDocument: false) else {
                throw LexumeError.notFound("Session")
            }

            let extracted: ExtractedPage
            switch overview.sourceType {
            case "pdf":
                try await Self.primeCache(pdfCache, sessionID: sessionID, persistence: persistence)
                guard pageNumber >= 1, pageNumber <= overview.selectedPageIndices.count,
                      let pdfPageData = pdfCache.withDocument(sessionID, {
                        PDFPageExtractor.singlePagePDFData(pageIndex: overview.selectedPageIndices[pageNumber - 1], in: $0)
                      })
                else {
                    throw LexumeError.notFound("Page \(pageNumber)")
                }
                extracted = try await extraction.extractPDFPage(pdfPageData, model: model)
            case "image":
                guard let imageData = try await persistence.originalDocument(sessionID) else {
                    throw LexumeError.notFound("Page \(pageNumber)")
                }
                extracted = try await extraction.extractImage(
                    imageData, mimeType: overview.sourceMimeType ?? "image/jpeg", model: model
                )
            default:
                extracted = try await extraction.reformat(text: overview.rawSourceText ?? "", model: model)
            }

            try await persistence.saveExtractedPage(sessionID, number: pageNumber, title: extracted.title, text: extracted.text)
            guard let saved = try await persistence.page(sessionID, number: pageNumber) else {
                throw LexumeError.notFound("Page \(pageNumber)")
            }
            return saved
        }

        inflightText[key] = task
        defer { inflightText[key] = nil }
        return try await task.value
    }

    /// Returns cached audio+timings if present; otherwise synthesizes and caches it.
    /// The page's text must already be extracted (call textPage first).
    func audioPage(
        sessionID: PersistentIdentifier,
        pageNumber: Int,
        voiceID: String,
        model: String,
        tuning: VoiceTuning
    ) async throws -> AudioResult {
        let key = PageKey(sessionID: sessionID, pageNumber: pageNumber)
        if let existing = inflightAudio[key] {
            return try await existing.value
        }

        let persistence = persistence
        let speech = speech
        let task = Task<AudioResult, Error> {
            if let cached = try await persistence.page(sessionID, number: pageNumber),
               let audioData = cached.audioData,
               let timingsData = cached.wordTimingsJSON,
               let timings = try? JSONDecoder().decode([WordTiming].self, from: timingsData) {
                return AudioResult(audioData: audioData, timings: timings)
            }
            guard let page = try await persistence.page(sessionID, number: pageNumber),
                  let text = page.extractedText, !text.isEmpty
            else {
                throw LexumeError.notFound("Page text")
            }

            let (audioData, timings) = try await speech.synthesize(text: text, voiceID: voiceID, model: model, settings: tuning)
            let timingsData = try JSONEncoder().encode(timings)
            try await persistence.saveAudio(sessionID, number: pageNumber, audioData: audioData, wordTimingsJSON: timingsData)
            return AudioResult(audioData: audioData, timings: timings)
        }

        inflightAudio[key] = task
        defer { inflightAudio[key] = nil }
        return try await task.value
    }

    /// Returns cached word boxes for Original Layout mode if present;
    /// otherwise rasterizes the page and runs on-device OCR (never Gemini —
    /// only Vision can report word positions) to compute and cache them.
    /// Unlike textPage/audioPage, this doesn't require the reflowed-text
    /// pipeline to have run first; it reads the original PDF/image bytes
    /// directly. The rasterized CGImage is only used transiently here for
    /// OCR input and is not returned — the caller re-renders its own display
    /// image from the same source bytes (cheap, and keeps CGImage from ever
    /// needing to cross this actor boundary).
    func layoutPage(sessionID: PersistentIdentifier, pageNumber: Int) async throws -> [WordBox] {
        let key = PageKey(sessionID: sessionID, pageNumber: pageNumber)
        if let existing = inflightLayout[key] {
            return try await existing.value
        }

        let persistence = persistence
        let pdfCache = pdfCache
        let task = Task<[WordBox], Error> {
            if let cached = try await persistence.page(sessionID, number: pageNumber),
               let boxesData = cached.wordBoxesJSON,
               let boxes = try? JSONDecoder().decode([WordBox].self, from: boxesData) {
                return boxes
            }
            guard let overview = try await persistence.overview(sessionID, includeDocument: false) else {
                throw LexumeError.notFound("Session")
            }

            let image: CGImage
            switch overview.sourceType {
            case "pdf":
                try await Self.primeCache(pdfCache, sessionID: sessionID, persistence: persistence)
                // Fast path: PDFs with a real text layer need no OCR at all.
                if pageNumber >= 1, pageNumber <= overview.selectedPageIndices.count,
                   let layerBoxes = pdfCache.withDocument(sessionID, { document in
                       document.page(at: overview.selectedPageIndices[pageNumber - 1])
                           .flatMap { PDFPageExtractor.textLayerWordBoxes(page: $0) }
                   }) {
                    let data = try JSONEncoder().encode(layerBoxes)
                    try await persistence.saveWordBoxes(sessionID, number: pageNumber, wordBoxesJSON: data)
                    return layerBoxes
                }
                guard pageNumber >= 1, pageNumber <= overview.selectedPageIndices.count,
                      let rendered = pdfCache.withDocument(sessionID, { document in
                        document.page(at: overview.selectedPageIndices[pageNumber - 1])
                            .flatMap { PDFPageExtractor.renderImage(page: $0) }
                      })
                else {
                    throw LexumeError.notFound("Page \(pageNumber)")
                }
                image = rendered
            case "image":
                guard let imageData = try await persistence.originalDocument(sessionID),
                      let platformImage = PlatformImage(data: imageData),
                      let cgImage = platformImage.platformCGImage
                else {
                    throw LexumeError.notFound("Page \(pageNumber)")
                }
                image = cgImage
            default:
                // Pasted/plain-text sessions have no original page to render.
                return []
            }

            let boxes = try await WordBoxRecognizer.recognizeWordBoxes(in: image)
            let boxesData = try JSONEncoder().encode(boxes)
            try await persistence.saveWordBoxes(sessionID, number: pageNumber, wordBoxesJSON: boxesData)
            return boxes
        }

        inflightLayout[key] = task
        defer { inflightLayout[key] = nil }
        return try await task.value
    }

    /// Loads and parses the session's PDF once; later pages reuse it.
    private static func primeCache(
        _ cache: PDFDocumentCache, sessionID: PersistentIdentifier, persistence: PersistenceActor
    ) async throws {
        guard !cache.contains(sessionID) else { return }
        guard let data = try await persistence.originalDocument(sessionID), cache.prime(sessionID, data: data) else {
            throw LexumeError.notFound("Original PDF")
        }
    }
}
