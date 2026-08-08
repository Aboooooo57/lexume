package com.aboooooo57.lexume.ui.reader

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.aboooooo57.lexume.data.local.AppPreferences
import com.aboooooo57.lexume.data.local.SecretKey
import com.aboooooo57.lexume.data.local.SecureKeyStore
import com.aboooooo57.lexume.data.model.TargetLanguage
import com.aboooooo57.lexume.data.model.TokenMap
import com.aboooooo57.lexume.data.model.WordTiming
import com.aboooooo57.lexume.data.repository.PageExtractionService
import com.aboooooo57.lexume.data.repository.PageSnapshot
import com.aboooooo57.lexume.data.repository.SessionOverview
import com.aboooooo57.lexume.data.repository.SessionRepository
import com.aboooooo57.lexume.network.GoogleTranslateClient
import com.aboooooo57.lexume.network.TranslationService
import com.aboooooo57.lexume.network.VoiceTuning
import com.aboooooo57.lexume.support.ParagraphSplitter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/**
 * Reflowed-text reading state for one session - the Android analog of
 * `Reader/ReaderViewModel.swift`, covering Phase 1 (M5), paragraph
 * translation (M6), and narration (M7): page loading/navigation, paragraph
 * splitting, bookmarks, translate, audio generation/playback with
 * page-to-page auto-advance. Key terms and Original Layout mode (the
 * reader's own deferred Phase 2) aren't ported - nothing calls them yet.
 */
class ReaderViewModel(
    private val sessionId: String,
    private val sessionRepository: SessionRepository,
    private val pageExtractionService: PageExtractionService,
    private val appPreferences: AppPreferences,
    private val secureKeyStore: SecureKeyStore,
    context: Context
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

    // Narration (M7). No `isExtractingForAudio` flag here, unlike
    // ReaderViewModel.swift - that one only ever fires from Original Layout
    // mode (extracting text on demand before narrating a page that hasn't
    // gone through the reflowed-text pipeline yet), which doesn't exist on
    // Android; text is always already extracted by the time this reader
    // shows a "Generate Audio" button at all.
    val playbackEngine = PlaybackEngine(context)
    var tokenMap by mutableStateOf<TokenMap?>(null)
        private set
    var hasAudio by mutableStateOf(false)
        private set
    var isGeneratingAudio by mutableStateOf(false)
        private set
    var audioError by mutableStateOf<String?>(null)
        private set

    /** Non-null while the >3000-char confirmation dialog should be shown; holds the char count. */
    var pendingAudioConfirmationCharCount by mutableStateOf<Int?>(null)
        private set
    private var pendingAutoPlay = false

    private val translationService: TranslationService = GoogleTranslateClient(secureKeyStore, appPreferences)

    // Owns callbacks fired from PlaybackEngine's own internal timer (not
    // tied to any single caller's Composable scope) - cancelled in
    // [release]. persistScope is deliberately separate and NOT cancelled
    // there: the final position-save on screen exit must survive
    // internalScope/PlaybackEngine teardown, the same way Swift's detached
    // `Task { try? await ... }` survives its own view disappearing.
    private val internalScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val persistScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    init {
        playbackEngine.onPersistPosition = { position ->
            persistScope.launch {
                try {
                    sessionRepository.updateAudioPosition(sessionId, currentPageNumber, position)
                } catch (e: Exception) {
                    // Best-effort - resume position is a convenience, not critical data.
                }
            }
        }
        playbackEngine.onFinished = {
            val total = overview?.totalPages
            if (total != null && currentPageNumber < total) {
                goToPage(currentPageNumber + 1, internalScope, autoPlay = true)
            }
        }
    }

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

    fun goToPage(number: Int, scope: CoroutineScope, autoPlay: Boolean = false) {
        val total = overview?.totalPages ?: return
        if (number < 1 || number > total) return
        playbackEngine.stop()
        currentPageNumber = number
        scope.launch {
            sessionRepository.updateLastPage(sessionId, number)
            loadCurrentPage(autoPlay)
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

    /** Called by the "Generate Audio" button; gates long pages behind confirmation. */
    fun requestGenerateAudio(scope: CoroutineScope, autoPlay: Boolean = false) {
        scope.launch { requestGenerateAudioCore(autoPlay) }
    }

    fun confirmPendingAudioGeneration(scope: CoroutineScope) {
        pendingAudioConfirmationCharCount = null
        val autoPlay = pendingAutoPlay
        pendingAutoPlay = false
        scope.launch { generateAudio(autoPlay) }
    }

    /** Same as [confirmPendingAudioGeneration], but also persists "don't ask again" (Settings → Reading → Narration can turn it back on). */
    fun confirmPendingAudioGenerationDontAskAgain(scope: CoroutineScope) {
        scope.launch {
            appPreferences.setWarnBeforeLongPageAudio(false)
            generateAudio(pendingAutoPlay)
        }
        pendingAudioConfirmationCharCount = null
        pendingAutoPlay = false
    }

    fun cancelPendingAudioGeneration() {
        pendingAudioConfirmationCharCount = null
        pendingAutoPlay = false
    }

    /** Persists the exact current position immediately (bypasses the ~15s throttle) - used on screen close. */
    fun persistPositionNow() {
        if (!hasAudio) return
        val position = playbackEngine.currentTime
        persistScope.launch {
            try {
                sessionRepository.updateAudioPosition(sessionId, currentPageNumber, position)
            } catch (e: Exception) {
                // Best-effort, same reasoning as onPersistPosition above.
            }
        }
    }

    /** Tears down the playback engine and internal callback scope - call once, when the reader screen is torn down. */
    fun release() {
        internalScope.cancel()
        playbackEngine.release()
    }

    private suspend fun reloadOverview() {
        try {
            overview = sessionRepository.overview(sessionId)
            bookmarkedParagraphs = overview?.bookmarkedTexts?.toSet() ?: emptySet()
        } catch (e: Exception) {
            loadError = e.message
        }
    }

    private suspend fun loadCurrentPage(autoPlay: Boolean = false) {
        isLoadingPage = true
        loadError = null
        audioError = null
        hasAudio = false
        tokenMap = null
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

            val cachedAudio = page.audioData
            val cachedTimingsJson = page.wordTimingsJson
            val cachedTimings = if (cachedAudio != null && cachedTimingsJson != null) {
                try {
                    WordTiming.listFromJson(cachedTimingsJson)
                } catch (e: Exception) {
                    null
                }
            } else {
                null
            }
            if (cachedAudio != null && cachedTimings != null) {
                loadIntoPlaybackEngine(cachedAudio, cachedTimings, autoPlay)
            } else if (appPreferences.audioMode.first() == "auto") {
                requestGenerateAudioCore(autoPlay)
            }
        } catch (e: Exception) {
            loadError = e.message ?: "Unknown error"
        } finally {
            isLoadingPage = false
        }
    }

    private suspend fun requestGenerateAudioCore(autoPlay: Boolean) {
        val charCount = paragraphs.joinToString("").length
        val hasElevenLabsKey = !secureKeyStore.get(SecretKey.ELEVENLABS_API_KEY).isNullOrEmpty()
        val warnBeforeLongPageAudio = appPreferences.warnBeforeLongPageAudio.first()
        if (charCount > LONG_PAGE_CHAR_THRESHOLD && hasElevenLabsKey && warnBeforeLongPageAudio) {
            pendingAudioConfirmationCharCount = charCount
            pendingAutoPlay = autoPlay
        } else {
            generateAudio(autoPlay)
        }
    }

    private suspend fun generateAudio(autoPlay: Boolean) {
        if (isGeneratingAudio) return
        isGeneratingAudio = true
        audioError = null
        try {
            val model = appPreferences.elevenModel.first()
            val voiceId = appPreferences.voiceId.first()
            val tuning = VoiceTuning(
                stability = appPreferences.stability.first().toDouble(),
                similarityBoost = appPreferences.similarityBoost.first().toDouble(),
                style = appPreferences.style.first().toDouble(),
                speed = appPreferences.speed.first().toDouble()
            )
            val result = pageExtractionService.audioPage(sessionId, currentPageNumber, voiceId, model, tuning)
            loadIntoPlaybackEngine(result.audioData, result.timings, autoPlay)
        } catch (e: Exception) {
            audioError = e.message ?: "Couldn't generate audio"
        } finally {
            isGeneratingAudio = false
        }
    }

    private fun loadIntoPlaybackEngine(audioData: ByteArray, timings: List<WordTiming>, autoPlay: Boolean) {
        val map = TokenMap.build(paragraphs, timings)
        tokenMap = map
        val resumeAt = if (overview?.lastAudioPage == currentPageNumber) overview?.lastAudioPosition else null
        playbackEngine.load(audioData, map, resumeAt)
        hasAudio = true
        if (autoPlay) playbackEngine.play()
    }

    private companion object {
        const val LONG_PAGE_CHAR_THRESHOLD = 3000
    }
}
