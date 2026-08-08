package com.aboooooo57.lexume.ui.reader

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.aboooooo57.lexume.data.local.AppPreferences
import com.aboooooo57.lexume.data.repository.PageExtractionService
import com.aboooooo57.lexume.data.repository.PageSnapshot
import com.aboooooo57.lexume.data.repository.SessionOverview
import com.aboooooo57.lexume.data.repository.SessionRepository
import com.aboooooo57.lexume.support.ParagraphSplitter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/**
 * Reflowed-text reading state for one session - the Android analog of
 * `Reader/ReaderViewModel.swift`, scoped to Phase 1 (M5): page loading/
 * navigation, paragraph splitting, bookmarks. Audio (M7), paragraph
 * translation/key terms (M6), and Original Layout mode (the reader's own
 * deferred Phase 2) aren't ported - nothing calls them yet.
 */
class ReaderViewModel(
    private val sessionId: String,
    private val sessionRepository: SessionRepository,
    private val pageExtractionService: PageExtractionService,
    private val appPreferences: AppPreferences
) {
    var overview by mutableStateOf<SessionOverview?>(null)
        private set
    var currentPage by mutableStateOf<PageSnapshot?>(null)
        private set
    var paragraphs by mutableStateOf<List<String>>(emptyList())
        private set
    var currentPageNumber by mutableStateOf(1)
        private set
    var isLoadingPage by mutableStateOf(false)
        private set
    var loadError by mutableStateOf<String?>(null)
        private set
    var bookmarkedParagraphs by mutableStateOf<Set<String>>(emptySet())
        private set

    suspend fun start() {
        reloadOverview()
        overview?.let { currentPageNumber = it.lastPage.coerceIn(1, it.totalPages) }
        sessionRepository.updateLastPage(sessionId, currentPageNumber)
        loadCurrentPage()
    }

    fun isBookmarked(paragraph: String): Boolean = bookmarkedParagraphs.contains(paragraph)

    fun toggleBookmark(paragraph: String, scope: CoroutineScope) {
        // Optimistic update so the button responds instantly, same reasoning
        // as ReaderViewModel.swift's own toggleBookmark.
        bookmarkedParagraphs = if (bookmarkedParagraphs.contains(paragraph)) {
            bookmarkedParagraphs - paragraph
        } else {
            bookmarkedParagraphs + paragraph
        }
        scope.launch { sessionRepository.toggleBookmark(sessionId, paragraph) }
    }

    fun goToPage(number: Int, scope: CoroutineScope) {
        val total = overview?.totalPages ?: return
        if (number < 1 || number > total) return
        currentPageNumber = number
        scope.launch {
            sessionRepository.updateLastPage(sessionId, number)
            loadCurrentPage()
        }
    }

    fun retry(scope: CoroutineScope) {
        scope.launch { loadCurrentPage() }
    }

    private suspend fun reloadOverview() {
        try {
            overview = sessionRepository.overview(sessionId)
            bookmarkedParagraphs = overview?.bookmarkedTexts?.toSet() ?: emptySet()
        } catch (e: Exception) {
            loadError = e.message
        }
    }

    private suspend fun loadCurrentPage() {
        isLoadingPage = true
        loadError = null
        try {
            val model = appPreferences.geminiModel.first()
            val page = pageExtractionService.textPage(sessionId, currentPageNumber, model)
            currentPage = page
            paragraphs = ParagraphSplitter.split(page.extractedText.orEmpty())
        } catch (e: Exception) {
            loadError = e.message ?: "Unknown error"
        } finally {
            isLoadingPage = false
        }
    }
}
