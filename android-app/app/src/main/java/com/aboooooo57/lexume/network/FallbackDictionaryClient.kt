package com.aboooooo57.lexume.network

import com.aboooooo57.lexume.data.local.AppPreferences
import com.aboooooo57.lexume.data.local.SecretKey
import com.aboooooo57.lexume.data.local.SecureKeyStore
import com.aboooooo57.lexume.data.model.DictionaryEntry
import kotlinx.coroutines.flow.first

/**
 * Falls back to a Gemini-generated entry when the free dictionaryapi.dev
 * (English-only) has nothing for a word - covers non-English words from a
 * non-English source document, as well as obscure English words the free
 * dictionary's database doesn't have. Skipped entirely (behaves exactly
 * like the free dictionary alone) when no Gemini key is configured, so this
 * changes nothing for anyone not using Gemini. Mirrors
 * `Services/FallbackDictionaryClient.swift`.
 */
class FallbackDictionaryClient(
    private val secureKeyStore: SecureKeyStore,
    private val appPreferences: AppPreferences,
    private val primary: DictionaryService = FreeDictionaryClient()
) : DictionaryService {
    override suspend fun define(word: String): DictionaryEntry? {
        // A thrown exception from `primary` (network failure, HTTP error, a
        // JSON decoding mismatch) is a real problem, distinct from it
        // succeeding but legitimately having nothing for this word -
        // conflating the two (swallowing every exception here used to)
        // meant a real failure silently repainted itself as "No definition
        // found for X" in the UI, burying the actual cause. Only a genuine
        // miss falls through to Gemini; a real failure is remembered and,
        // if Gemini can't rescue it either, surfaces to the caller instead
        // of vanishing - mirrors the same fix in
        // `FallbackDictionaryClient.swift`.
        var primaryError: Exception? = null
        try {
            primary.define(word)?.let { return it }
        } catch (e: Exception) {
            primaryError = e
        }
        // dictionaryapi.dev only has base headwords, not possessive forms -
        // a document tapped word-by-word is full of "the sector's share",
        // "the fund's strategy" etc. Retry the free dictionary once against
        // the base noun before reaching for Gemini, so this common case
        // still resolves without needing a Gemini key at all.
        strippedPossessive(word)?.let { base ->
            try {
                primary.define(base)?.let { return it }
            } catch (e: Exception) {
                primaryError = e
            }
        }
        val apiKey = secureKeyStore.get(SecretKey.GEMINI_API_KEY)
        if (apiKey.isNullOrEmpty()) {
            primaryError?.let { throw it }
            return null
        }
        val model = appPreferences.geminiModel.first()
        return try {
            GeminiClient(secureKeyStore).defineWord(word, model)
        } catch (e: Exception) {
            // The free dictionary's own failure (if any) is more
            // informative than "Gemini also didn't work" when both failed.
            throw primaryError ?: e
        }
    }

    /** Strips a trailing possessive - straight apostrophe ('s) or the typographic curly apostrophe (’s) OCR/PDF text often uses instead - null if [word] doesn't end that way. */
    private fun strippedPossessive(word: String): String? {
        for (suffix in POSSESSIVE_SUFFIXES) {
            if (word.length > suffix.length && word.endsWith(suffix, ignoreCase = true)) {
                return word.dropLast(suffix.length)
            }
        }
        return null
    }

    private companion object {
        val POSSESSIVE_SUFFIXES = listOf("'s", "’s")
    }
}
