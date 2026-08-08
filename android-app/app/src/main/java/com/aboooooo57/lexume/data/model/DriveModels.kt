package com.aboooooo57.lexume.data.model

import android.util.Base64
import java.util.Date
import org.json.JSONArray
import org.json.JSONObject

/**
 * Mirrors `Services/Drive/DriveModels.swift` field-for-field, including its
 * exact JSON shape - not just Android's own naming conventions - so a
 * backup written by this app and one written by the Mac/iPad apps are
 * interchangeable in the same Drive "Lexume" folder (the whole point of the
 * feature, for anyone using more than one platform with the same account).
 * Two encoding quirks that take deliberate matching, not Kotlin defaults:
 * - Dates: Swift's default `JSONEncoder` writes `Date` as seconds since the
 *   *Apple reference date* (2001-01-01T00:00:00Z), not Unix epoch or
 *   ISO8601 - see [toAppleReferenceSeconds]/[dateFromAppleReferenceSeconds].
 * - Binary (`Data`/`ByteArray`): Swift's default is base64 text, which is
 *   also the natural choice in JSON from Kotlin, so no special handling
 *   needed there beyond using [Base64].
 */

private const val APPLE_EPOCH_OFFSET_SECONDS = 978_307_200L // 2001-01-01T00:00:00Z minus 1970-01-01T00:00:00Z

private fun Date.toAppleReferenceSeconds(): Double = (time / 1000.0) - APPLE_EPOCH_OFFSET_SECONDS

private fun dateFromAppleReferenceSeconds(seconds: Double): Date =
    Date(((seconds + APPLE_EPOCH_OFFSET_SECONDS) * 1000).toLong())

private fun JSONObject.optStringOrNull(key: String): String? = opt(key) as? String

private fun ByteArray.toBase64(): String = Base64.encodeToString(this, Base64.NO_WRAP)
private fun String.fromBase64(): ByteArray = Base64.decode(this, Base64.NO_WRAP)

data class DriveFile(val id: String, val name: String)

/** One logged word, as mirrored into a session's Drive backup JSON. Mirrors `VocabBackupEntry`. */
data class VocabBackupEntry(val word: String, val createdAt: Date, val definitionSnippet: String?) {
    fun toJson(): JSONObject = JSONObject()
        .put("word", word)
        .put("createdAt", createdAt.toAppleReferenceSeconds())
        .put("definitionSnippet", definitionSnippet)

    companion object {
        fun fromJson(o: JSONObject): VocabBackupEntry = VocabBackupEntry(
            word = o.getString("word"),
            createdAt = dateFromAppleReferenceSeconds(o.getDouble("createdAt")),
            definitionSnippet = o.optStringOrNull("definitionSnippet")
        )
    }
}

/**
 * One page's text/timings, as mirrored into a session's Drive backup JSON.
 * Audio itself is uploaded as a separate `.mp3` file (see [hasAudio]) to
 * keep the JSON small. Mirrors `SessionBackupPage`.
 */
data class SessionBackupPage(
    val pageNumber: Int,
    val title: String?,
    val extractedText: String?,
    val wordTimingsJson: ByteArray?,
    val hasAudio: Boolean
) {
    fun toJson(): JSONObject = JSONObject()
        .put("pageNumber", pageNumber)
        .put("title", title)
        .put("extractedText", extractedText)
        // Capital-JSON spelling, not Kotlin's usual "Json" - matches the
        // Swift struct's literal property name (`wordTimingsJSON`), which
        // is also this key's exact spelling on the wire.
        .put("wordTimingsJSON", wordTimingsJson?.toBase64())
        .put("hasAudio", hasAudio)

    companion object {
        fun fromJson(o: JSONObject): SessionBackupPage = SessionBackupPage(
            pageNumber = o.getInt("pageNumber"),
            title = o.optStringOrNull("title"),
            extractedText = o.optStringOrNull("extractedText"),
            wordTimingsJson = o.optStringOrNull("wordTimingsJSON")?.fromBase64(),
            hasAudio = o.optBoolean("hasAudio", false)
        )
    }
}

/**
 * Everything needed to recreate a session on another device, serialized to
 * `<session-id>.json` in the Drive "Lexume" folder. Keyed by the session's
 * stable id so restore can skip sessions that already exist locally.
 * Mirrors `SessionBackupPayload`.
 */
data class SessionBackupPayload(
    val id: String,
    val name: String,
    val sourceType: String,
    val createdAt: Date,
    val totalPages: Int,
    val lastPage: Int,
    val lastAudioPage: Int?,
    val lastAudioPosition: Double?,
    val selectedPageIndices: List<Int>,
    val originalFileName: String?,
    val sourceMimeType: String?,
    val rawSourceText: String?,
    val originalDocument: ByteArray?,
    val pages: List<SessionBackupPage>,
    val bookmarks: List<String>,
    val vocabulary: List<VocabBackupEntry>
) {
    fun toJson(): JSONObject {
        val pagesArray = JSONArray()
        pages.forEach { pagesArray.put(it.toJson()) }
        val bookmarksArray = JSONArray()
        bookmarks.forEach { bookmarksArray.put(it) }
        val vocabArray = JSONArray()
        vocabulary.forEach { vocabArray.put(it.toJson()) }

        return JSONObject()
            .put("id", id)
            .put("name", name)
            .put("sourceType", sourceType)
            .put("createdAt", createdAt.toAppleReferenceSeconds())
            .put("totalPages", totalPages)
            .put("lastPage", lastPage)
            .put("lastAudioPage", lastAudioPage)
            .put("lastAudioPosition", lastAudioPosition)
            .put("selectedPageIndices", JSONArray(selectedPageIndices))
            .put("originalFileName", originalFileName)
            .put("sourceMimeType", sourceMimeType)
            .put("rawSourceText", rawSourceText)
            .put("originalDocument", originalDocument?.toBase64())
            .put("pages", pagesArray)
            .put("bookmarks", bookmarksArray)
            .put("vocabulary", vocabArray)
    }

    companion object {
        fun fromJson(o: JSONObject): SessionBackupPayload {
            val indices = o.optJSONArray("selectedPageIndices")
            val pagesJson = o.optJSONArray("pages")
            val bookmarksJson = o.optJSONArray("bookmarks")
            val vocabJson = o.optJSONArray("vocabulary")

            return SessionBackupPayload(
                // Case-normalized (Swift's UUID.uuidString is uppercase,
                // Kotlin's UUID.randomUUID().toString() is lowercase) - the
                // restore path compares this id against locally-known ids
                // to skip duplicates, and a case mismatch would otherwise
                // defeat that check for a cross-platform backup.
                id = o.getString("id").lowercase(),
                name = o.getString("name"),
                sourceType = o.getString("sourceType"),
                createdAt = dateFromAppleReferenceSeconds(o.getDouble("createdAt")),
                totalPages = o.getInt("totalPages"),
                lastPage = o.getInt("lastPage"),
                lastAudioPage = if (o.isNull("lastAudioPage") || !o.has("lastAudioPage")) null else o.getInt("lastAudioPage"),
                lastAudioPosition = if (o.isNull("lastAudioPosition") || !o.has("lastAudioPosition")) null else o.getDouble("lastAudioPosition"),
                selectedPageIndices = (0 until (indices?.length() ?: 0)).map { indices!!.getInt(it) },
                originalFileName = o.optStringOrNull("originalFileName"),
                sourceMimeType = o.optStringOrNull("sourceMimeType"),
                rawSourceText = o.optStringOrNull("rawSourceText"),
                originalDocument = o.optStringOrNull("originalDocument")?.fromBase64(),
                pages = (0 until (pagesJson?.length() ?: 0)).map { SessionBackupPage.fromJson(pagesJson!!.getJSONObject(it)) },
                bookmarks = (0 until (bookmarksJson?.length() ?: 0)).map { bookmarksJson!!.getString(it) },
                vocabulary = (0 until (vocabJson?.length() ?: 0)).map { VocabBackupEntry.fromJson(vocabJson!!.getJSONObject(it)) }
            )
        }
    }
}
