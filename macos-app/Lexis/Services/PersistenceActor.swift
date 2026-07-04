import Foundation
import SwiftData

/// Sendable snapshot of a session, safe to pass across actor boundaries.
struct SessionOverview: Sendable {
    var name: String
    var sourceType: String
    var totalPages: Int
    var lastPage: Int
    var selectedPageIndices: [Int]
    var originalDocument: Data?
    var rawSourceText: String?
    var sourceMimeType: String?
    var lastAudioPage: Int?
    var lastAudioPosition: Double?
    var bookmarkedTexts: [String]
}

/// Sendable snapshot of a page, safe to pass across actor boundaries.
struct PageSnapshot: Sendable {
    var pageNumber: Int
    var title: String?
    var extractedText: String?
    var audioData: Data?
    var wordTimingsJSON: Data?
}

/// All SwiftData reads/writes for session + page data go through this actor,
/// keeping blob encoding/decoding off the main thread.
@ModelActor
actor PersistenceActor {
    func createPDFSession(
        name: String,
        fileName: String,
        originalDocument: Data,
        selectedPageIndices: [Int]
    ) throws -> PersistentIdentifier {
        let session = ReadingSession()
        session.name = name
        session.sourceType = "pdf"
        session.totalPages = selectedPageIndices.count
        session.lastPage = 1
        session.selectedPageIndices = selectedPageIndices
        session.originalDocument = originalDocument
        session.originalFileName = fileName
        modelContext.insert(session)
        try modelContext.save()
        return session.persistentModelID
    }

    func createTextSession(name: String, rawText: String) throws -> PersistentIdentifier {
        let session = ReadingSession()
        session.name = name
        session.sourceType = "text"
        session.totalPages = 1
        session.lastPage = 1
        session.rawSourceText = rawText
        modelContext.insert(session)
        try modelContext.save()
        return session.persistentModelID
    }

    func createImageSession(
        name: String,
        fileName: String,
        imageData: Data,
        mimeType: String
    ) throws -> PersistentIdentifier {
        let session = ReadingSession()
        session.name = name
        session.sourceType = "image"
        session.totalPages = 1
        session.lastPage = 1
        session.originalDocument = imageData
        session.originalFileName = fileName
        session.sourceMimeType = mimeType
        modelContext.insert(session)
        try modelContext.save()
        return session.persistentModelID
    }

    func overview(_ sessionID: PersistentIdentifier) throws -> SessionOverview? {
        guard let session = try fetchSession(sessionID) else { return nil }
        return SessionOverview(
            name: session.name,
            sourceType: session.sourceType,
            totalPages: session.totalPages,
            lastPage: session.lastPage,
            selectedPageIndices: session.selectedPageIndices,
            originalDocument: session.originalDocument,
            rawSourceText: session.rawSourceText,
            sourceMimeType: session.sourceMimeType,
            lastAudioPage: session.lastAudioPage,
            lastAudioPosition: session.lastAudioPosition,
            bookmarkedTexts: session.bookmarks?.map(\.text) ?? []
        )
    }

    func page(_ sessionID: PersistentIdentifier, number: Int) throws -> PageSnapshot? {
        guard let session = try fetchSession(sessionID),
              let existing = session.pages?.first(where: { $0.pageNumber == number })
        else { return nil }
        return PageSnapshot(
            pageNumber: existing.pageNumber,
            title: existing.title,
            extractedText: existing.extractedText,
            audioData: existing.audioData,
            wordTimingsJSON: existing.wordTimingsJSON
        )
    }

    func saveExtractedPage(_ sessionID: PersistentIdentifier, number: Int, title: String, text: String) throws {
        guard let session = try fetchSession(sessionID) else {
            throw LexisError.notFound("Session")
        }
        if let existing = session.pages?.first(where: { $0.pageNumber == number }) {
            existing.title = title
            existing.extractedText = text
        } else {
            let page = SessionPage()
            page.pageNumber = number
            page.title = title
            page.extractedText = text
            page.session = session
            modelContext.insert(page)
            if session.pages == nil { session.pages = [] }
            session.pages?.append(page)
        }
        try modelContext.save()
    }

    func updateLastPage(_ sessionID: PersistentIdentifier, page: Int) throws {
        guard let session = try fetchSession(sessionID) else { return }
        session.lastPage = page
        try modelContext.save()
    }

    func saveAudio(_ sessionID: PersistentIdentifier, number: Int, audioData: Data, wordTimingsJSON: Data) throws {
        guard let session = try fetchSession(sessionID),
              let page = session.pages?.first(where: { $0.pageNumber == number })
        else {
            throw LexisError.notFound("Page \(number)")
        }
        page.audioData = audioData
        page.wordTimingsJSON = wordTimingsJSON
        try modelContext.save()
    }

    /// Throttled resume-position write (the caller enforces the ≤15s cadence).
    func updateAudioPosition(_ sessionID: PersistentIdentifier, page: Int, position: Double) throws {
        guard let session = try fetchSession(sessionID) else { return }
        session.lastAudioPage = page
        session.lastAudioPosition = position
        try modelContext.save()
    }

    /// Logs (or refreshes) a dictionary lookup, mirroring the reference
    /// backend's auto-log-on-every-tap vocabulary behavior.
    func addVocabulary(_ sessionID: PersistentIdentifier, word: String, definitionSnippet: String?) throws {
        guard let session = try fetchSession(sessionID) else { return }
        if let existing = session.vocabulary?.first(where: { $0.word == word }) {
            if let definitionSnippet { existing.definitionSnippet = definitionSnippet }
            existing.createdAt = Date.now
        } else {
            let entry = VocabularyEntry()
            entry.word = word
            entry.definitionSnippet = definitionSnippet
            entry.session = session
            modelContext.insert(entry)
            if session.vocabulary == nil { session.vocabulary = [] }
            session.vocabulary?.append(entry)
        }
        try modelContext.save()
    }

    /// Toggles a paragraph bookmark by exact text match; returns the new state.
    func toggleBookmark(_ sessionID: PersistentIdentifier, text: String) throws -> Bool {
        guard let session = try fetchSession(sessionID) else { return false }
        if let existing = session.bookmarks?.first(where: { $0.text == text }) {
            modelContext.delete(existing)
            try modelContext.save()
            return false
        } else {
            let bookmark = Bookmark()
            bookmark.text = text
            bookmark.session = session
            modelContext.insert(bookmark)
            if session.bookmarks == nil { session.bookmarks = [] }
            session.bookmarks?.append(bookmark)
            try modelContext.save()
            return true
        }
    }

    /// Deletes every cached page's extracted text/audio across all sessions
    /// (sessions themselves are untouched) so the next visit re-extracts
    /// with whatever service/engine is currently active — used by the
    /// Settings "Clear Cached Pages" action.
    func clearAllCachedPages() throws {
        let pages = try modelContext.fetch(FetchDescriptor<SessionPage>())
        for page in pages {
            modelContext.delete(page)
        }
        try modelContext.save()
    }

    private func fetchSession(_ sessionID: PersistentIdentifier) throws -> ReadingSession? {
        let descriptor = FetchDescriptor<ReadingSession>(
            predicate: #Predicate { $0.persistentModelID == sessionID }
        )
        return try modelContext.fetch(descriptor).first
    }
}
