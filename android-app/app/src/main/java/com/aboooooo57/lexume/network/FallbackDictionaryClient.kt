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
        try {
            primary.define(word)?.let { return it }
        } catch (e: Exception) {
            // Fall through to Gemini, same as the Swift `try?` swallow.
        }
        val apiKey = secureKeyStore.get(SecretKey.GEMINI_API_KEY)
        if (apiKey.isNullOrEmpty()) return null
        val model = appPreferences.geminiModel.first()
        return try {
            GeminiClient(secureKeyStore).defineWord(word, model)
        } catch (e: Exception) {
            null
        }
    }
}
