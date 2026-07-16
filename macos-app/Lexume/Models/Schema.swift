import Foundation
import SwiftData

// CloudKit compatibility rules for every model in this file:
// every stored property has a default value or is optional, all
// relationships are optional, and no @Attribute(.unique) is used.

@Model
final class ReadingSession {
    var id: UUID = UUID()
    var name: String = "Untitled"
    /// "pdf", "text", or "image"
    var sourceType: String = "pdf"
    var createdAt: Date = Date.now
    var totalPages: Int = 1
    /// 1-based page the user last viewed.
    var lastPage: Int = 1
    var lastAudioPage: Int? = nil
    var lastAudioPosition: Double? = nil
    /// 0-based indices into the original PDF for the pages the user selected.
    var selectedPageIndices: [Int] = []
    var originalFileName: String? = nil
    /// Copy of the imported document (PDF or image bytes); source of truth
    /// for lazy page extraction.
    @Attribute(.externalStorage) var originalDocument: Data? = nil
    /// For sourceType "text": the pasted/plain-text/markdown source, reformatted
    /// by Gemini (or passed through unchanged offline) on first read. Single-page sessions only.
    @Attribute(.externalStorage) var rawSourceText: String? = nil
    /// For sourceType "image": the MIME type of originalDocument (e.g. "image/jpeg").
    var sourceMimeType: String? = nil

    @Relationship(deleteRule: .cascade, inverse: \SessionPage.session)
    var pages: [SessionPage]? = []
    @Relationship(deleteRule: .cascade, inverse: \Bookmark.session)
    var bookmarks: [Bookmark]? = []
    @Relationship(deleteRule: .cascade, inverse: \VocabularyEntry.session)
    var vocabulary: [VocabularyEntry]? = []

    init() {}
}

@Model
final class SessionPage {
    /// 1-based position within the session (not the original PDF page number).
    var pageNumber: Int = 1
    var title: String? = nil
    /// Clean prose from Gemini; paragraphs derived by splitting on blank lines.
    var extractedText: String? = nil
    @Attribute(.externalStorage) var audioData: Data? = nil
    /// JSON-encoded [WordTiming].
    var wordTimingsJSON: Data? = nil
    /// JSON-encoded [Data] of extracted page images (PNG, >=100px).
    @Attribute(.externalStorage) var pageImagesJSON: Data? = nil
    /// JSON-encoded [WordBox] from on-device OCR, cached for Original Layout mode.
    @Attribute(.externalStorage) var wordBoxesJSON: Data? = nil
    var session: ReadingSession? = nil

    init() {}

    var paragraphs: [String] {
        guard let text = extractedText else { return [] }
        return Self.splitParagraphs(text)
    }

    /// Mirrors the reference implementation: split on 2+ newlines, trim, drop empties.
    static func splitParagraphs(_ text: String) -> [String] {
        text.components(separatedBy: .newlines)
            .reduce(into: [[String]]()) { groups, line in
                let trimmed = line.trimmingCharacters(in: .whitespaces)
                if trimmed.isEmpty {
                    if !(groups.last?.isEmpty ?? true) { groups.append([]) }
                } else {
                    if groups.isEmpty { groups.append([]) }
                    groups[groups.count - 1].append(line)
                }
            }
            .map { $0.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
    }
}

@Model
final class Bookmark {
    var text: String = ""
    var createdAt: Date = Date.now
    var session: ReadingSession? = nil

    init() {}
}

@Model
final class VocabularyEntry {
    var word: String = ""
    var createdAt: Date = Date.now
    var definitionSnippet: String? = nil
    var session: ReadingSession? = nil

    init() {}
}
