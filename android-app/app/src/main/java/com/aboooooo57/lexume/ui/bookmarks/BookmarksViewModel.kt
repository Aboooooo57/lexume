package com.aboooooo57.lexume.ui.bookmarks

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.aboooooo57.lexume.data.repository.SessionRepository
import java.util.Date
import kotlinx.coroutines.flow.combine

/** One bookmarked paragraph, with its session's name folded in - the Room analog of `Bookmark.session?.name`. */
data class BookmarkRow(
    val id: Long,
    val text: String,
    val createdAt: Date,
    val sessionId: String,
    val sessionName: String
)

/**
 * Bookmarks screen state - the Android analog of `Library/BookmarksListView.swift`'s
 * `@Query`-backed, newest-first bookmark list, with each row's session name
 * joined in (Room's flat tables need this done explicitly; SwiftData gets it
 * for free via `bookmark.session?.name`).
 */
class BookmarksViewModel(private val sessionRepository: SessionRepository) {
    var searchText by mutableStateOf("")
        private set
    var bookmarks by mutableStateOf<List<BookmarkRow>>(emptyList())
        private set

    suspend fun observe() {
        combine(
            sessionRepository.observeBookmarks(),
            sessionRepository.observeSessions()
        ) { bookmarks, sessions ->
            val sessionsById = sessions.associateBy { it.id }
            bookmarks.map { bookmark ->
                BookmarkRow(
                    id = bookmark.id,
                    text = bookmark.text,
                    createdAt = bookmark.createdAt,
                    sessionId = bookmark.sessionId,
                    sessionName = sessionsById[bookmark.sessionId]?.name ?: "Deleted Session"
                )
            }
        }.collect { this.bookmarks = it }
    }

    fun setSearchText(text: String) {
        searchText = text
    }
}
