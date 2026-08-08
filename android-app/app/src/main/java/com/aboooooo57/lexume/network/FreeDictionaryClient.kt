package com.aboooooo57.lexume.network

import com.aboooooo57.lexume.data.model.DictionaryEntry
import com.aboooooo57.lexume.support.LexumeException
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.Request
import org.json.JSONArray

/** Free, keyless proxy: https://dictionaryapi.dev - mirrors `Services/FreeDictionaryClient.swift`. */
class FreeDictionaryClient : DictionaryService {
    override suspend fun define(word: String): DictionaryEntry? {
        val cleaned = word.lowercase()
        DictionaryCache.get(cleaned)?.let { return it }

        // addPathSegment percent-encodes correctly for a URL *path* segment
        // (e.g. space -> %20) - java.net.URLEncoder targets query strings/
        // form data instead (space -> '+'), which this API wouldn't decode
        // as a space in the path.
        val url = "https://api.dictionaryapi.dev/api/v2/entries/en/".toHttpUrl()
            .newBuilder()
            .addPathSegment(cleaned)
            .build()
        val request = Request.Builder()
            .url(url)
            .get()
            .build()

        val (statusCode, responseBody) = HttpClients.shared.executeSuspending(request)
        if (statusCode == 404) return null
        if (statusCode !in 200..299) {
            throw LexumeException.HttpFailure("Dictionary", statusCode, responseBody.take(200))
        }

        val entry = try {
            DictionaryEntry.firstFromJsonArray(JSONArray(responseBody))
        } catch (e: Exception) {
            throw LexumeException.DecodingFailure("Dictionary", e.message ?: "malformed response")
        } ?: return null

        DictionaryCache.set(cleaned, entry)
        return entry
    }
}
