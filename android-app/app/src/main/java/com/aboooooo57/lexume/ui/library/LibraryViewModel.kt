package com.aboooooo57.lexume.ui.library

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.aboooooo57.lexume.data.repository.SessionRepository
import java.util.Date
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch

/** One Library card's worth of data - session fields plus counts joined in from the separate bookmarks/vocabulary tables. */
data class SessionSummary(
    val id: String,
    val name: String,
    val sourceType: String,
    val createdAt: Date,
    val lastPage: Int,
    val totalPages: Int,
    val bookmarkCount: Int,
    val vocabularyCount: Int
)

/**
 * Library screen state - the Android analog of `Library/LibraryView.swift`'s
 * `@Query`-backed session list, plus its bookmark/vocabulary counts (which
 * SwiftData gets for free via `session.bookmarks?.count` on its object
 * graph; Room's flat tables need an explicit join, done here in Kotlin by
 * combining the three already-existing observe*() flows rather than adding
 * a new custom Room query).
 */
class LibraryViewModel(private val sessionRepository: SessionRepository) {
    var searchText by mutableStateOf("")
        private set
    var summaries by mutableStateOf<List<SessionSummary>>(emptyList())
        private set

    suspend fun observe() {
        combine(
            sessionRepository.observeSessions(),
            sessionRepository.observeBookmarks(),
            sessionRepository.observeVocabulary()
        ) { sessions, bookmarks, vocabulary ->
            val bookmarkCounts = bookmarks.groupingBy { it.sessionId }.eachCount()
            val vocabularyCounts = vocabulary.groupingBy { it.sessionId }.eachCount()
            sessions.map { session ->
                SessionSummary(
                    id = session.id,
                    name = session.name,
                    sourceType = session.sourceType,
                    createdAt = session.createdAt,
                    lastPage = session.lastPage,
                    totalPages = session.totalPages,
                    bookmarkCount = bookmarkCounts[session.id] ?: 0,
                    vocabularyCount = vocabularyCounts[session.id] ?: 0
                )
            }
        }.collect { summaries = it }
    }

    // Named updateSearchText, not setSearchText - the latter clashes at the
    // JVM signature level with the private synthesized setter Kotlin
    // generates for the `searchText` property above (`private set` still
    // compiles to a method named setSearchText, just with private
    // visibility - visibility doesn't factor into signature-clash
    // detection), which javac/kotlinc reports as a real compile error.
    fun updateSearchText(text: String) {
        searchText = text
    }

    fun rename(sessionId: String, name: String, scope: CoroutineScope) {
        scope.launch { sessionRepository.renameSession(sessionId, name) }
    }

    fun delete(sessionId: String, scope: CoroutineScope) {
        scope.launch { sessionRepository.deleteSession(sessionId) }
    }
}
