package com.aboooooo57.lexume.data.repository

import com.aboooooo57.lexume.data.local.LexumeDatabase
import com.aboooooo57.lexume.data.local.entity.BookmarkEntity
import com.aboooooo57.lexume.data.local.entity.ReadingSessionEntity
import com.aboooooo57.lexume.data.local.entity.SessionPageEntity
import com.aboooooo57.lexume.data.local.entity.VocabularyEntryEntity
import com.aboooooo57.lexume.support.LexumeException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import java.util.Date

/** Mirrors `PersistenceActor.SessionOverview` (macOS `Services/PersistenceActor.swift`). */
data class SessionOverview(
    val name: String,
    val sourceType: String,
    val totalPages: Int,
    val lastPage: Int,
    val selectedPageIndices: List<Int>,
    val originalDocument: ByteArray?,
    val rawSourceText: String?,
    val sourceMimeType: String?,
    val lastAudioPage: Int?,
    val lastAudioPosition: Double?,
    val bookmarkedTexts: List<String>
)

/** Mirrors `PersistenceActor.PageSnapshot`. */
data class PageSnapshot(
    val pageNumber: Int,
    val title: String?,
    val extractedText: String?,
    val audioData: ByteArray?,
    val wordTimingsJson: ByteArray?,
    val wordBoxesJson: ByteArray?
)

/**
 * All Room reads/writes go through this repository, keeping DB work off the
 * main thread - the Android analog of `Services/PersistenceActor.swift` (a
 * SwiftData `@ModelActor`). Sessions are identified by their UUID string
 * ([ReadingSessionEntity.id]) everywhere; unlike the Swift app, which
 * bridges between SwiftData's ephemeral `PersistentIdentifier` (local nav)
 * and this same UUID (Drive backup identity), Android just uses the one
 * identifier throughout.
 */
class SessionRepository(db: LexumeDatabase) {
    private val sessions = db.readingSessionDao()
    private val pages = db.sessionPageDao()
    private val bookmarks = db.bookmarkDao()
    private val vocabulary = db.vocabularyEntryDao()

    suspend fun createPdfSession(
        name: String,
        fileName: String,
        originalDocument: ByteArray,
        selectedPageIndices: List<Int>
    ): String = withContext(Dispatchers.IO) {
        val session = ReadingSessionEntity(
            name = name,
            sourceType = "pdf",
            totalPages = selectedPageIndices.size,
            lastPage = 1,
            selectedPageIndices = selectedPageIndices,
            originalDocument = originalDocument,
            originalFileName = fileName
        )
        sessions.insert(session)
        session.id
    }

    suspend fun createTextSession(name: String, rawText: String): String = withContext(Dispatchers.IO) {
        val session = ReadingSessionEntity(
            name = name,
            sourceType = "text",
            totalPages = 1,
            lastPage = 1,
            rawSourceText = rawText
        )
        sessions.insert(session)
        session.id
    }

    suspend fun createImageSession(
        name: String,
        fileName: String,
        imageData: ByteArray,
        mimeType: String
    ): String = withContext(Dispatchers.IO) {
        val session = ReadingSessionEntity(
            name = name,
            sourceType = "image",
            totalPages = 1,
            lastPage = 1,
            originalDocument = imageData,
            originalFileName = fileName,
            sourceMimeType = mimeType
        )
        sessions.insert(session)
        session.id
    }

    suspend fun overview(sessionId: String): SessionOverview? = withContext(Dispatchers.IO) {
        val session = sessions.getById(sessionId) ?: return@withContext null
        SessionOverview(
            name = session.name,
            sourceType = session.sourceType,
            totalPages = session.totalPages,
            lastPage = session.lastPage,
            selectedPageIndices = session.selectedPageIndices,
            originalDocument = session.originalDocument,
            rawSourceText = session.rawSourceText,
            sourceMimeType = session.sourceMimeType,
            lastAudioPage = session.lastAudioPage,
            lastAudioPosition = session.lastAudioPosition,
            bookmarkedTexts = bookmarks.getForSession(sessionId).map { it.text }
        )
    }

    suspend fun page(sessionId: String, number: Int): PageSnapshot? = withContext(Dispatchers.IO) {
        val existing = pages.getPage(sessionId, number) ?: return@withContext null
        PageSnapshot(
            pageNumber = existing.pageNumber,
            title = existing.title,
            extractedText = existing.extractedText,
            audioData = existing.audioData,
            wordTimingsJson = existing.wordTimingsJson,
            wordBoxesJson = existing.wordBoxesJson
        )
    }

    suspend fun saveExtractedPage(sessionId: String, number: Int, title: String, text: String) =
        withContext(Dispatchers.IO) {
            sessions.getById(sessionId) ?: throw LexumeException.NotFound("Session")
            val existing = pages.getPage(sessionId, number)
            if (existing != null) {
                pages.update(existing.copy(title = title, extractedText = text))
            } else {
                pages.insert(SessionPageEntity(sessionId = sessionId, pageNumber = number, title = title, extractedText = text))
            }
        }

    suspend fun updateLastPage(sessionId: String, page: Int) = withContext(Dispatchers.IO) {
        sessions.updateLastPage(sessionId, page)
    }

    suspend fun saveAudio(sessionId: String, number: Int, audioData: ByteArray, wordTimingsJson: ByteArray) =
        withContext(Dispatchers.IO) {
            val existing = pages.getPage(sessionId, number) ?: throw LexumeException.NotFound("Page $number")
            pages.update(existing.copy(audioData = audioData, wordTimingsJson = wordTimingsJson))
        }

    /**
     * Caches Original Layout mode's word boxes for a page (Phase 2). Unlike
     * [saveAudio] (which requires text to already be extracted), this can be
     * the first thing ever saved for a page - Original Layout mode doesn't
     * depend on the reflowed-text pipeline having run - so it creates the
     * page row if needed, mirroring [saveExtractedPage].
     */
    suspend fun saveWordBoxes(sessionId: String, number: Int, wordBoxesJson: ByteArray) =
        withContext(Dispatchers.IO) {
            sessions.getById(sessionId) ?: throw LexumeException.NotFound("Session")
            val existing = pages.getPage(sessionId, number)
            if (existing != null) {
                pages.update(existing.copy(wordBoxesJson = wordBoxesJson))
            } else {
                pages.insert(SessionPageEntity(sessionId = sessionId, pageNumber = number, wordBoxesJson = wordBoxesJson))
            }
        }

    /** Throttled resume-position write (the caller enforces the ~<=15s cadence). */
    suspend fun updateAudioPosition(sessionId: String, page: Int, position: Double) = withContext(Dispatchers.IO) {
        sessions.updateAudioPosition(sessionId, page, position)
    }

    /**
     * Logs (or refreshes) a dictionary lookup, mirroring the reference
     * backend's auto-log-on-every-tap vocabulary behavior. Silently no-ops
     * if the session no longer exists (e.g. deleted mid-lookup) - matches
     * Swift's `guard let session = ... else { return }`, rather than
     * surfacing a foreign-key-constraint crash for a harmless race.
     */
    suspend fun addVocabulary(sessionId: String, word: String, definitionSnippet: String?) = withContext(Dispatchers.IO) {
        if (sessions.getById(sessionId) == null) return@withContext
        val existing = vocabulary.findByWord(sessionId, word)
        if (existing != null) {
            vocabulary.update(
                existing.copy(
                    definitionSnippet = definitionSnippet ?: existing.definitionSnippet,
                    createdAt = Date()
                )
            )
        } else {
            vocabulary.insert(VocabularyEntryEntity(sessionId = sessionId, word = word, definitionSnippet = definitionSnippet))
        }
    }

    /**
     * Toggles a paragraph bookmark by exact text match; returns the new
     * state. Returns `false` without writing anything if the session no
     * longer exists - same silent-no-op reasoning as [addVocabulary].
     */
    suspend fun toggleBookmark(sessionId: String, text: String): Boolean = withContext(Dispatchers.IO) {
        if (sessions.getById(sessionId) == null) return@withContext false
        val existing = bookmarks.findByText(sessionId, text)
        if (existing != null) {
            bookmarks.delete(existing)
            false
        } else {
            bookmarks.insert(BookmarkEntity(sessionId = sessionId, text = text))
            true
        }
    }

    /**
     * Deletes every cached page's extracted text/audio across all sessions
     * (sessions themselves are untouched) so the next visit re-extracts with
     * whatever service/engine is currently active - backs Settings' "Clear
     * Cached Pages" action (M3).
     */
    suspend fun clearAllCachedPages() = withContext(Dispatchers.IO) {
        pages.deleteAllPages()
    }

    suspend fun deleteSession(sessionId: String) = withContext(Dispatchers.IO) {
        sessions.delete(sessionId)
    }

    /**
     * Library screen (M8) - mirrors `LibraryView.swift`'s rename alert. A
     * blank (post-trim) name is a no-op, same net effect as Swift's own
     * "fall back to the existing name" branch, just skipping the write
     * instead of writing the unchanged value back.
     */
    suspend fun renameSession(sessionId: String, name: String) = withContext(Dispatchers.IO) {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) return@withContext
        sessions.updateName(sessionId, trimmed)
    }

    /** Library screen (M8) - newest session first, matching `LibraryView.swift`. */
    fun observeSessions(): Flow<List<ReadingSessionEntity>> = sessions.observeAll()

    /** Bookmarks screen (M8). */
    fun observeBookmarks(): Flow<List<BookmarkEntity>> = bookmarks.observeAll()

    /** Vocabulary screen (M8) - regrouped into a per-session tree there, same as `VocabularyListView.swift`. */
    fun observeVocabulary(): Flow<List<VocabularyEntryEntity>> = vocabulary.observeAll()

    // Google Drive backup/restore (`allSessionsForBackup`, `pageAudioData`,
    // `existingSessionIDs`, `importSession` on the Swift side) are added in
    // M9 when the Drive sync feature itself is built, not wired in ahead of
    // time - same "add when needed" discipline as the Gradle dependencies.
}
