package com.aboooooo57.lexume.network

import android.content.Context
import android.speech.tts.TextToSpeech
import com.google.mlkit.nl.languageid.LanguageIdentification
import java.util.Locale
import kotlin.coroutines.resume
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.suspendCancellableCoroutine

/**
 * Speaks a word aloud on-device - the fallback used whenever the free
 * dictionary API has no recorded pronunciation clip for it (common: its
 * audio coverage is inconsistent), so every word can still be heard,
 * offline, with no API key required. Mirrors
 * `Dictionary/DictionaryViewModel.swift`'s `speakWord`/`bestVoiceLanguage`,
 * using ML Kit Language Identification in place of `NLLanguageRecognizer`
 * and Android's `TextToSpeech` in place of `AVSpeechSynthesizer`.
 */
class PronunciationService(context: Context) {
    private val languageIdentifier = LanguageIdentification.getClient()
    private val readyDeferred = CompletableDeferred<Boolean>()
    private val tts: TextToSpeech = TextToSpeech(context.applicationContext) { status ->
        readyDeferred.complete(status == TextToSpeech.SUCCESS)
    }

    suspend fun speak(word: String) {
        if (!readyDeferred.await()) return

        val languageTag = identifyLanguage(word)
        val locale = if (languageTag == "und") Locale.US else Locale.forLanguageTag(languageTag)
        // Falls back to English if this specific locale's voice data isn't
        // installed on-device - still speaks something rather than
        // silently failing.
        val result = tts.setLanguage(locale)
        if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
            tts.setLanguage(Locale.US)
        }
        tts.stop()
        tts.speak(word, TextToSpeech.QUEUE_FLUSH, null, "lexume-pronunciation")
    }

    fun shutdown() {
        tts.shutdown()
    }

    /**
     * A single word is a weak signal for language detection (many short
     * words are valid in several languages at once), but it's still a
     * strict improvement over always assuming English - without this, a
     * German word would be read aloud with English phonetics.
     */
    private suspend fun identifyLanguage(word: String): String =
        suspendCancellableCoroutine { continuation ->
            languageIdentifier.identifyLanguage(word)
                .addOnSuccessListener { languageTag -> continuation.resume(languageTag) }
                .addOnFailureListener { continuation.resume("und") }
        }
}
