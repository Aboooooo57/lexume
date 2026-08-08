package com.aboooooo57.lexume.network

import android.util.Base64
import com.aboooooo57.lexume.data.local.SecretKey
import com.aboooooo57.lexume.data.local.SecureKeyStore
import com.aboooooo57.lexume.support.LexumeException
import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.suspendCancellableCoroutine
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import org.json.JSONArray
import org.json.JSONObject

/**
 * Talks to the Gemini REST API directly (no SDK), via OkHttp + hand-built
 * `org.json` bodies - the Android analog of `Services/GeminiClient.swift`'s
 * `URLSession`/`JSONSerialization` approach (in turn mirroring
 * `backend/api/utils.py`). Only the extraction surface (M4) is ported here;
 * `translate`/`defineWord`/`keyTerms` arrive with M6.
 */
class GeminiClient(private val secureKeyStore: SecureKeyStore) : ExtractionService {
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build()

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

            val (statusCode, responseBody) = executeCall(request)
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

    private suspend fun executeCall(request: Request): Pair<Int, String> =
        suspendCancellableCoroutine { continuation ->
            val call = client.newCall(request)
            continuation.invokeOnCancellation { call.cancel() }
            call.enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) {
                    continuation.resumeWithException(e)
                }

                override fun onResponse(call: Call, response: Response) {
                    response.use {
                        val text = it.body?.string().orEmpty()
                        continuation.resume(it.code to text)
                    }
                }
            })
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
    }
}
