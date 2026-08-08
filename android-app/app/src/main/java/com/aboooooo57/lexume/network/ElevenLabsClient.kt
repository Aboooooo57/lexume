package com.aboooooo57.lexume.network

import android.util.Base64
import com.aboooooo57.lexume.data.local.SecretKey
import com.aboooooo57.lexume.data.local.SecureKeyStore
import com.aboooooo57.lexume.data.model.WordTiming
import com.aboooooo57.lexume.support.LexumeException
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

/** Mirrors `Services/ElevenLabsClient.swift`'s `VoiceTuning`. */
data class VoiceTuning(val stability: Double, val similarityBoost: Double, val style: Double, val speed: Double)

/** Mirrors `Services/ElevenLabsClient.swift`'s `Voice`. */
data class Voice(val id: String, val name: String)

/** Result of a synthesis call: audio bytes + per-word timings. */
data class SynthesisResult(val audioData: ByteArray, val timings: List<WordTiming>)

/** Mirrors `Services/ElevenLabsClient.swift`'s `SpeechService` protocol. */
interface SpeechService {
    suspend fun synthesize(text: String, voiceId: String, model: String, settings: VoiceTuning): SynthesisResult
    suspend fun voices(): List<Voice>
}

/** Talks to the ElevenLabs REST API directly (no SDK). Mirrors `Services/ElevenLabsClient.swift`. */
class ElevenLabsClient(private val secureKeyStore: SecureKeyStore) : SpeechService {
    override suspend fun synthesize(text: String, voiceId: String, model: String, settings: VoiceTuning): SynthesisResult {
        val apiKey = secureKeyStore.get(SecretKey.ELEVENLABS_API_KEY)
        if (apiKey.isNullOrEmpty()) throw LexumeException.MissingApiKey("ElevenLabs")

        val body = JSONObject()
            .put("text", text)
            .put("model_id", model)
            .put(
                "voice_settings",
                JSONObject()
                    .put("stability", settings.stability)
                    .put("similarity_boost", settings.similarityBoost)
                    .put("style", settings.style)
                    .put("speed", settings.speed)
                    .put("use_speaker_boost", true)
            )

        val responseBody = RetryPolicy.withRetry("ElevenLabs") {
            val request = Request.Builder()
                .url("https://api.elevenlabs.io/v1/text-to-speech/$voiceId/with-timestamps?output_format=mp3_44100_128")
                .addHeader("Content-Type", "application/json")
                .addHeader("xi-api-key", apiKey)
                .post(body.toString().toRequestBody(JSON_MEDIA_TYPE))
                .build()

            val (statusCode, text) = HttpClients.shared.executeSuspending(request)
            if (statusCode == 429) throw RateLimitedException()
            if (statusCode !in 200..299) {
                throw LexumeException.HttpFailure("ElevenLabs", statusCode, text.take(200))
            }
            text
        }

        val json = try {
            JSONObject(responseBody)
        } catch (e: Exception) {
            throw LexumeException.DecodingFailure("ElevenLabs", e.message ?: "malformed response")
        }
        val audioData = try {
            Base64.decode(json.getString("audio_base64"), Base64.DEFAULT)
        } catch (e: Exception) {
            throw LexumeException.DecodingFailure("ElevenLabs", "invalid base64 audio")
        }

        val alignment = json.optJSONObject("alignment")
        val characters = alignment?.optJSONArray("characters")
        val starts = alignment?.optJSONArray("character_start_times_seconds")
        val ends = alignment?.optJSONArray("character_end_times_seconds")
        val timings = charsToWords(
            characters = (0 until (characters?.length() ?: 0)).map { characters!!.getString(it) },
            starts = (0 until (starts?.length() ?: 0)).map { starts!!.getDouble(it) },
            ends = (0 until (ends?.length() ?: 0)).map { ends!!.getDouble(it) }
        )
        return SynthesisResult(audioData, timings)
    }

    override suspend fun voices(): List<Voice> {
        val apiKey = secureKeyStore.get(SecretKey.ELEVENLABS_API_KEY)
        if (apiKey.isNullOrEmpty()) throw LexumeException.MissingApiKey("ElevenLabs")

        val request = Request.Builder()
            .url("https://api.elevenlabs.io/v1/voices")
            .get()
            .addHeader("xi-api-key", apiKey)
            .build()
        val (statusCode, responseBody) = HttpClients.shared.executeSuspending(request)
        if (statusCode !in 200..299) {
            throw LexumeException.HttpFailure("ElevenLabs", statusCode, responseBody.take(200))
        }

        return try {
            val voicesArray = JSONObject(responseBody).getJSONArray("voices")
            (0 until voicesArray.length()).map { i ->
                val entry = voicesArray.getJSONObject(i)
                Voice(id = entry.getString("voice_id"), name = entry.getString("name"))
            }
        } catch (e: Exception) {
            throw LexumeException.DecodingFailure("ElevenLabs", e.message ?: "malformed response")
        }
    }

    private companion object {
        val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()
    }
}

/**
 * Ports `backend/api/utils.py`'s `_chars_to_words` (via
 * `ElevenLabsClient.swift`'s `charsToWords`) verbatim: any whitespace is a
 * boundary; a word's start is its first character's start time, its end is
 * its last character's end time.
 */
fun charsToWords(characters: List<String>, starts: List<Double>, ends: List<Double>): List<WordTiming> {
    val words = mutableListOf<WordTiming>()
    val currentChars = StringBuilder()
    var currentStart: Double? = null
    var currentEnd = 0.0

    val count = minOf(characters.size, starts.size, ends.size)
    for (index in 0 until count) {
        val char = characters[index]
        val isWhitespace = char.isNotEmpty() && char.all { it.isWhitespace() }
        if (isWhitespace) {
            if (currentChars.isNotEmpty()) {
                words.add(WordTiming(currentChars.toString(), currentStart ?: 0.0, currentEnd))
                currentChars.clear()
                currentStart = null
            }
        } else {
            if (currentStart == null) currentStart = starts[index]
            currentChars.append(char)
            currentEnd = ends[index]
        }
    }
    if (currentChars.isNotEmpty()) {
        words.add(WordTiming(currentChars.toString(), currentStart ?: 0.0, currentEnd))
    }
    return words
}
