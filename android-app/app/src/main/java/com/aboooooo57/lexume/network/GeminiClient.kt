package com.aboooooo57.lexume.network

import android.util.Base64
import com.aboooooo57.lexume.data.local.SecretKey
import com.aboooooo57.lexume.data.local.SecureKeyStore
import com.aboooooo57.lexume.data.model.DictionaryEntry
import com.aboooooo57.lexume.support.LexumeException
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject

/**
 * Talks to the Gemini REST API directly (no SDK), via OkHttp + hand-built
 * `org.json` bodies - the Android analog of `Services/GeminiClient.swift`'s
 * `URLSession`/`JSONSerialization` approach (in turn mirroring
 * `backend/api/utils.py`). `extractImage`/`reformat` (M4) implement
 * [ExtractionService]; `defineWord`/`translate` (M6) are used directly by
 * [FallbackDictionaryClient]/[GoogleTranslateClient], same as on the Swift
 * side. `keyTerms` isn't ported - see the reader's own doc comments for why.
 */
class GeminiClient(private val secureKeyStore: SecureKeyStore) : ExtractionService {
    override suspend fun extractImage(imageData: ByteArray, mimeType: String, model: String): ExtractedPage {
        val parts = JSONArray()
            .put(
                JSONObject().put(
                    "inline_data",
                    JSONObject()
                        .put("mime_type", mimeType)
                        .put("data", Base64.encodeToString(imageData, Base64.NO_WRAP))
                )
            )
            .put(JSONObject().put("text", EXTRACT_PROMPT))
        return generateStructured(parts, model)
    }

    override suspend fun reformat(text: String, model: String): ExtractedPage {
        val parts = JSONArray().put(JSONObject().put("text", REFORMAT_PROMPT + text))
        return generateStructured(parts, model)
    }

    /** Translate to any language, auto-detecting the source. Mirrors `GeminiClient.swift`'s `translate`. */
    suspend fun translate(text: String, language: String, model: String): String {
        val prompt = "Translate the following word or phrase to $language (detect its source language " +
            "automatically - it is not necessarily English). Return ONLY the translated text, no extra " +
            "commentary or explanations.\n\nText: $text"
        val body = JSONObject().put(
            "contents",
            JSONArray().put(JSONObject().put("parts", JSONArray().put(JSONObject().put("text", prompt))))
        )
        return send(body, model)
    }

    /**
     * Dictionary-style definition for a word/phrase in any language - the
     * fallback [FallbackDictionaryClient] reaches for when the free
     * English-only dictionaryapi.dev has nothing for it. Mirrors
     * `GeminiClient.swift`'s `defineWord`.
     */
    suspend fun defineWord(word: String, model: String): DictionaryEntry? {
        val prompt = "Define the word or short phrase \"$word\" like a dictionary would. It may be in any " +
            "language, not just English - identify it automatically. Write definitions and examples in " +
            "English. If you can't identify it as a real word or phrase, return " +
            "{\"word\": \"$word\", \"meanings\": []}."
        val body = JSONObject()
            .put("contents", JSONArray().put(JSONObject().put("parts", JSONArray().put(JSONObject().put("text", prompt)))))
            .put(
                "generationConfig",
                JSONObject()
                    .put("responseMimeType", "application/json")
                    .put("responseSchema", DEFINE_WORD_SCHEMA)
            )
        val responseText = send(body, model)
        val entry = try {
            DictionaryEntry.fromJson(JSONObject(responseText))
        } catch (e: Exception) {
            throw LexumeException.DecodingFailure("Gemini", e.message ?: "empty response")
        }
        return if (entry.meanings.isEmpty()) null else entry
    }

    private suspend fun generateStructured(parts: JSONArray, model: String): ExtractedPage {
        val body = JSONObject()
            .put("contents", JSONArray().put(JSONObject().put("parts", parts)))
            .put(
                "generationConfig",
                JSONObject()
                    .put("responseMimeType", "application/json")
                    .put(
                        "responseSchema",
                        JSONObject()
                            .put("type", "OBJECT")
                            .put(
                                "properties",
                                JSONObject()
                                    .put("title", JSONObject().put("type", "STRING"))
                                    .put("text", JSONObject().put("type", "STRING"))
                            )
                            .put("required", JSONArray().put("title").put("text"))
                    )
            )
        val responseText = send(body, model)
        return try {
            val json = JSONObject(responseText)
            ExtractedPage(title = json.getString("title"), text = json.getString("text"))
        } catch (e: Exception) {
            throw LexumeException.DecodingFailure("Gemini", e.message ?: "malformed response")
        }
    }

    private suspend fun send(body: JSONObject, model: String): String {
        val apiKey = secureKeyStore.get(SecretKey.GEMINI_API_KEY)
        if (apiKey.isNullOrEmpty()) throw LexumeException.MissingApiKey("Gemini")

        return RetryPolicy.withRetry("Gemini") {
            val request = Request.Builder()
                .url("https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent")
                .addHeader("Content-Type", "application/json")
                .addHeader("x-goog-api-key", apiKey)
                .post(body.toString().toRequestBody(JSON_MEDIA_TYPE))
                .build()

            val (statusCode, responseBody) = HttpClients.shared.executeSuspending(request)
            if (statusCode == 429) throw RateLimitedException()
            if (statusCode !in 200..299) {
                throw LexumeException.HttpFailure("Gemini", statusCode, responseBody.take(200))
            }

            try {
                JSONObject(responseBody)
                    .getJSONArray("candidates")
                    .getJSONObject(0)
                    .getJSONObject("content")
                    .getJSONArray("parts")
                    .getJSONObject(0)
                    .getString("text")
            } catch (e: Exception) {
                throw LexumeException.DecodingFailure("Gemini", e.message ?: "no candidates in response")
            }
        }
    }

    private companion object {
        val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()

        const val EXTRACT_PROMPT = "Extract the text from the provided content. Return a JSON object with exactly two fields:\n" +
            "  - title: a short descriptive title (3–8 words) for this passage\n" +
            "  - text: the full extracted text as clean readable prose (no Markdown, no asterisks, no hashes, preserve paragraph breaks)\n" +
            "Do not add any commentary outside the JSON object."

        const val REFORMAT_PROMPT = "Reformat the following text as clean readable prose and give it a short title.\n" +
            "Return a JSON object with exactly two fields:\n" +
            "  - title: a short descriptive title (3–8 words) for this passage\n" +
            "  - text: the reformatted prose (no Markdown, no asterisks, preserve paragraph breaks)\n\n\n"

        /** Mirrors `GeminiClient.swift`'s `defineWord` response schema exactly. */
        val DEFINE_WORD_SCHEMA: JSONObject = JSONObject()
            .put("type", "OBJECT")
            .put(
                "properties",
                JSONObject()
                    .put("word", JSONObject().put("type", "STRING"))
                    .put("phonetic", JSONObject().put("type", "STRING"))
                    .put(
                        "meanings",
                        JSONObject()
                            .put("type", "ARRAY")
                            .put(
                                "items",
                                JSONObject()
                                    .put("type", "OBJECT")
                                    .put(
                                        "properties",
                                        JSONObject()
                                            .put("partOfSpeech", JSONObject().put("type", "STRING"))
                                            .put(
                                                "definitions",
                                                JSONObject()
                                                    .put("type", "ARRAY")
                                                    .put(
                                                        "items",
                                                        JSONObject()
                                                            .put("type", "OBJECT")
                                                            .put(
                                                                "properties",
                                                                JSONObject()
                                                                    .put("definition", JSONObject().put("type", "STRING"))
                                                                    .put("example", JSONObject().put("type", "STRING"))
                                                            )
                                                            .put("required", JSONArray().put("definition"))
                                                    )
                                            )
                                    )
                                    .put("required", JSONArray().put("partOfSpeech").put("definitions"))
                            )
                    )
            )
            .put("required", JSONArray().put("word").put("meanings"))
    }
}
