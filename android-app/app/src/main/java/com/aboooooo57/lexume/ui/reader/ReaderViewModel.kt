package com.aboooooo57.lexume.ui.reader

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.aboooooo57.lexume.data.local.AppPreferences
import com.aboooooo57.lexume.data.local.SecureKeyStore
import com.aboooooo57.lexume.data.model.TargetLanguage
import com.aboooooo57.lexume.data.repository.PageExtractionService
import com.aboooooo57.lexume.data.repository.PageSnapshot
import com.aboooooo57.lexume.data.repository.SessionOverview
import com.aboooooo57.lexume.data.repository.SessionRepository
import com.aboooooo57.lexume.network.GoogleTranslateClient
import com.aboooooo57.lexume.network.TranslationService
import com.aboooooo57.lexume.support.ParagraphSplitter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/**
 * Reflowed-text reading state for one session - the Android analog of
 * `Reader/ReaderViewModel.swift`, scoped to Phase 1 (M5) + M6's paragraph
 * translation: page loading/navigation, paragraph splitting, bookmarks,
 * per-paragraph translate. Audio (M7), key terms, and Original Layout mode
 * (the reader's own deferred Phase 2) aren't ported - nothing calls them
 * yet.
 */
class ReaderViewModel(
    private val sessionId: String,
    private val sessionRepository: SessionRepository,
    private val pageExtractionService: PageExtractionService,
    private val appPreferences: AppPreferences,
    secureKeyStore: SecureKeyStore
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

    /** Keyed by paragraph index within the current page - reset on every page change. */
    var paragraphTranslations by mutableStateOf<Map<Int, String>>(emptyMap())
        private set
    var translatingParagraphIndices by mutableStateOf<Set<Int>>(emptySet())
        private set
    var paragraphTranslationErrors by mutableStateOf<Map<Int, String>>(emptyMap())
        private set

    private val translationService: TranslationService = GoogleTranslateClient(secureKeyStore, appPreferences)

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

    fun requestParagraphTranslation(index: Int, text: String, scope: CoroutineScope) {
        if (paragraphTranslations.containsKey(index) || translatingParagraphIndices.contains(index)) return
        translatingParagraphIndices = translatingParagraphIndices + index
        paragraphTranslationErrors = paragraphTranslationErrors - index
        scope.launch {
            try {
                val language = TargetLanguage.named(appPreferences.targetLanguage.first())
                val preferGemini = appPreferences.translationEngine.first() == "gemini"
                val result = translationService.translate(text, language, preferGemini)
                paragraphTranslations = paragraphTranslations + (index to result)
            } catch (e: Exception) {
                paragraphTranslationErrors = paragraphTranslationErrors + (index to (e.message ?: "Translation failed"))
            }
            translatingParagraphIndices = translatingParagraphIndices - index
        }
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
        // Keyed by paragraph index within the page, so stale entries from a
        // different page must not leak in - mirrors ReaderViewModel.swift's
        // own reset list in loadCurrentPage().
        paragraphTranslations = emptyMap()
        translatingParagraphIndices = emptySet()
        paragraphTranslationErrors = emptyMap()
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
