package com.aboooooo57.lexume.ui.vocabulary

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.aboooooo57.lexume.data.repository.SessionRepository
import java.util.Date
import kotlinx.coroutines.flow.combine

/** One vocabulary row - a logged dictionary lookup, with its session's name folded in for display/CSV/search. */
data class VocabularyEntryRow(
    val id: Long,
    val word: String,
    val createdAt: Date,
    val definitionSnippet: String?,
    val sessionId: String,
    val sessionName: String,
    val sourceType: String
)

/** One session's worth of vocabulary - mirrors `VocabularyListView.swift`'s `SessionGroup`. */
data class VocabularySessionGroup(
    val sessionId: String,
    val name: String,
    val sourceType: String,
    val latestLookup: Date,
    val entries: List<VocabularyEntryRow>
)

/**
 * Vocabulary screen state - the Android analog of `Library/VocabularyListView.swift`'s
 * `@Query`-backed entry list. Regroups the flat, newest-first
 * `observeVocabulary()` stream into a per-session tree, same grouping/sort
 * rules as Swift: groups ordered by their most recent lookup, words within a
 * group ordered oldest-first (the order the reader met them).
 */
class VocabularyViewModel(private val sessionRepository: SessionRepository) {
    var searchText by mutableStateOf("")
        private set
    var groups by mutableStateOf<List<VocabularySessionGroup>>(emptyList())
        private set
    var allEntries by mutableStateOf<List<VocabularyEntryRow>>(emptyList())
        private set

    suspend fun observe() {
        combine(
            sessionRepository.observeVocabulary(),
            sessionRepository.observeSessions()
        ) { entries, sessions ->
            val sessionsById = sessions.associateBy { it.id }
            entries.map { entry ->
                val session = sessionsById[entry.sessionId]
                VocabularyEntryRow(
                    id = entry.id,
                    word = entry.word,
                    createdAt = entry.createdAt,
                    definitionSnippet = entry.definitionSnippet,
                    sessionId = entry.sessionId,
                    sessionName = session?.name ?: "Deleted Session",
                    sourceType = session?.sourceType ?: "text"
                )
            }
        }.collect {
            allEntries = it
            regroup()
        }
    }

    fun setSearchText(text: String) {
        searchText = text
        regroup()
    }

    /** Called whenever [allEntries] or [searchText] change, since [groups] is derived from both. */
    private fun regroup() {
        val query = searchText.trim()
        val filtered = if (query.isEmpty()) {
            allEntries
        } else {
            allEntries.filter { it.word.contains(query, ignoreCase = true) }
        }
        groups = filtered
            .groupBy { it.sessionId }
            .map { (sessionId, groupEntries) ->
                VocabularySessionGroup(
                    sessionId = sessionId,
                    name = groupEntries.first().sessionName,
                    sourceType = groupEntries.first().sourceType,
                    latestLookup = groupEntries.maxOf { it.createdAt },
                    entries = groupEntries.sortedBy { it.createdAt }
                )
            }
            .sortedByDescending { it.latestLookup }
    }
}
