package com.aboooooo57.lexume.ui.dictionary

import android.media.MediaPlayer
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.aboooooo57.lexume.data.local.AppPreferences
import com.aboooooo57.lexume.data.model.DictionaryEntry
import com.aboooooo57.lexume.data.model.TargetLanguage
import com.aboooooo57.lexume.data.repository.SessionRepository
import com.aboooooo57.lexume.network.DictionaryService
import com.aboooooo57.lexume.network.PronunciationService
import com.aboooooo57.lexume.network.TranslationService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/**
 * State for one dictionary panel session - the Android analog of
 * `Dictionary/DictionaryViewModel.swift`. [sessionId] is nullable purely for
 * API-shape parity with the Swift side (a lookup with no reading session
 * behind it, e.g. macOS's Services-menu entry point); Android has no such
 * entry point yet, so it's always non-null in practice, reached only from
 * the reader.
 */
class DictionaryViewModel(
    private val sessionId: String?,
    private val dictionary: DictionaryService,
    private val translation: TranslationService,
    private val sessionRepository: SessionRepository,
    private val appPreferences: AppPreferences,
    private val pronunciation: PronunciationService
) {
    var history by mutableStateOf<List<String>>(emptyList())
        private set
    var entry by mutableStateOf<DictionaryEntry?>(null)
        private set
    var isLoading by mutableStateOf(false)
        private set
    var errorMessage by mutableStateOf<String?>(null)
        private set

    /** Translations keyed by the exact source text (word/definition/example) - reset whenever the looked-up word changes. */
    var translations by mutableStateOf<Map<String, String>>(emptyMap())
        private set
    var translatingKeys by mutableStateOf<Set<String>>(emptySet())
        private set
    var translationErrorKeys by mutableStateOf<Set<String>>(emptySet())
        private set

    var targetLanguage by mutableStateOf(TargetLanguage.named("Persian"))
        private set

    val currentWord: String get() = history.lastOrNull().orEmpty()

    private var mediaPlayer: MediaPlayer? = null

    suspend fun lookup(word: String, resetHistory: Boolean = false) {
        history = if (resetHistory || history.isEmpty()) listOf(word) else history + word
        fetchCurrent()
    }

    fun jump(index: Int, scope: CoroutineScope) {
        if (index < 0 || index >= history.size) return
        history = history.subList(0, index + 1)
        scope.launch { fetchCurrent() }
    }

    fun goBack(scope: CoroutineScope) {
        if (history.size <= 1) return
        history = history.dropLast(1)
        scope.launch { fetchCurrent() }
    }

    fun reset(scope: CoroutineScope) {
        val first = history.firstOrNull() ?: return
        if (history.size <= 1) return
        history = listOf(first)
        scope.launch { fetchCurrent() }
    }

    fun translate(text: String, scope: CoroutineScope) {
        if (translations.containsKey(text) || translatingKeys.contains(text)) return
        translatingKeys = translatingKeys + text
        translationErrorKeys = translationErrorKeys - text
        scope.launch {
            val language = appPreferences.targetLanguage.first().let { TargetLanguage.named(it) }
            val preferGemini = appPreferences.translationEngine.first() == "gemini"
            try {
                val result = translation.translate(text, language, preferGemini)
                translations = translations + (text to result)
            } catch (e: Exception) {
                translationErrorKeys = translationErrorKeys + text
            }
            translatingKeys = translatingKeys - text
        }
    }

    /** Plays a remote pronunciation clip (the free dictionary API's own audio, when it has one). */
    fun playPronunciation(url: String) {
        mediaPlayer?.release()
        mediaPlayer = MediaPlayer().apply {
            setDataSource(url)
            setOnPreparedListener { start() }
            setOnErrorListener { _, _, _ -> true }
            prepareAsync()
        }
    }

    /** On-device speech fallback for words with no recorded pronunciation clip. */
    fun speakWord(word: String, scope: CoroutineScope) {
        scope.launch { pronunciation.speak(word) }
    }

    fun release() {
        mediaPlayer?.release()
        mediaPlayer = null
    }

    private suspend fun fetchCurrent() {
        val word = currentWord
        if (word.isEmpty()) return
        isLoading = true
        errorMessage = null
        entry = null
        translations = emptyMap()
        translatingKeys = emptySet()
        translationErrorKeys = emptySet()
        targetLanguage = TargetLanguage.named(appPreferences.targetLanguage.first())
        try {
            val result = dictionary.define(word)
            entry = result
            if (result != null && sessionId != null) {
                val snippet = result.meanings.firstOrNull()?.definitions?.firstOrNull()?.definition
                sessionRepository.addVocabulary(sessionId, word, snippet)
            }
        } catch (e: Exception) {
            errorMessage = e.message ?: "Couldn't look up \"$word\"."
        } finally {
            isLoading = false
        }
    }
}
