package com.aboooooo57.lexume.network

import com.aboooooo57.lexume.data.local.AppPreferences
import com.aboooooo57.lexume.data.local.SecureKeyStore
import com.aboooooo57.lexume.data.model.TargetLanguage
import com.aboooooo57.lexume.support.LexumeException
import kotlinx.coroutines.flow.first
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.Request
import org.json.JSONArray

/**
 * Free, keyless primary engine (Google's unofficial "gtx" endpoint, same one
 * the reference backend uses) with a Gemini fallback for accuracy or when
 * the free endpoint fails. Mirrors `Services/GoogleTranslateClient.swift`.
 */
class GoogleTranslateClient(
    private val secureKeyStore: SecureKeyStore,
    private val appPreferences: AppPreferences
) : TranslationService {
    override suspend fun translate(text: String, language: TargetLanguage, preferGemini: Boolean): String {
        val model = appPreferences.geminiModel.first()
        val gemini = GeminiClient(secureKeyStore)

        if (preferGemini) {
            return gemini.translate(text, language.displayName, model)
        }
        try {
            val result = translateViaGoogle(text, language)
            if (result.isNotEmpty()) return result
        } catch (e: Exception) {
            // Fall through to Gemini; the google-specific failure reason is
            // still useful if Gemini also fails and has no key configured.
        }
        return gemini.translate(text, language.displayName, model)
    }

    private suspend fun translateViaGoogle(text: String, language: TargetLanguage): String {
        val url = "https://translate.googleapis.com/translate_a/single".toHttpUrl()
            .newBuilder()
            .addQueryParameter("client", "gtx")
            // Auto-detect the source language instead of assuming English -
            // matches the fix already applied on the Swift side (this
            // endpoint used to be hardcoded to sl=en, which silently
            // mistranslated any non-English source document's text).
            .addQueryParameter("sl", "auto")
            .addQueryParameter("tl", language.code)
            .addQueryParameter("dt", "t")
            .addQueryParameter("q", text)
            .build()

        val request = Request.Builder()
            .url(url)
            .get()
            // This unofficial endpoint rejects requests with no User-Agent
            // (or a clearly non-browser one) - same fix as the Swift side.
            .addHeader(
                "User-Agent",
                "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) " +
                    "Chrome/120.0.0.0 Mobile Safari/537.36"
            )
            .build()

        val (statusCode, responseBody) = HttpClients.shared.executeSuspending(request)
        if (statusCode !in 200..299) {
            throw LexumeException.HttpFailure("Translate", statusCode, responseBody.take(200))
        }

        // Response shape: [[[translatedChunk, originalChunk, ...], ...], ...]
        // - reconstruct the full translation by joining each chunk's first element.
        val segments = try {
            JSONArray(responseBody).optJSONArray(0)
        } catch (e: Exception) {
            null
        } ?: throw LexumeException.DecodingFailure("Translate", "unexpected response shape")

        val result = StringBuilder()
        for (i in 0 until segments.length()) {
            val pair = segments.optJSONArray(i) ?: continue
            result.append(pair.optString(0, ""))
        }
        if (result.isEmpty()) throw LexumeException.DecodingFailure("Translate", "empty translation")
        return result.toString()
    }
}
