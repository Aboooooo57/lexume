package com.aboooooo57.lexume.network

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL

/**
 * Cheap authenticated GETs used by the "Test" buttons in onboarding/
 * settings. Mirrors macOS's `Services/KeyValidator.swift`. Uses plain
 * `HttpURLConnection` rather than Retrofit/OkHttp (not wired in until
 * M4/M6) - a single-request status-code check doesn't need a full HTTP
 * client stack yet.
 */
object KeyValidator {
    sealed class Result {
        object Valid : Result()
        data class Invalid(val reason: String) : Result()
    }

    suspend fun testGeminiKey(key: String): Result = withContext(Dispatchers.IO) {
        perform(
            urlString = "https://generativelanguage.googleapis.com/v1beta/models",
            headerName = "x-goog-api-key",
            key = key,
            serviceName = "Gemini"
        )
    }

    suspend fun testElevenLabsKey(key: String): Result = withContext(Dispatchers.IO) {
        perform(
            urlString = "https://api.elevenlabs.io/v1/user",
            headerName = "xi-api-key",
            key = key,
            serviceName = "ElevenLabs"
        )
    }

    private fun perform(urlString: String, headerName: String, key: String, serviceName: String): Result {
        return try {
            val connection = URL(urlString).openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.setRequestProperty(headerName, key)
            connection.connectTimeout = 10_000
            connection.readTimeout = 10_000
            try {
                when (val status = connection.responseCode) {
                    200 -> Result.Valid
                    401, 403 -> Result.Invalid("$serviceName rejected this key.")
                    429 -> Result.Invalid(
                        "$serviceName is rate-limiting; the key may still be valid — try again in a minute."
                    )
                    else -> Result.Invalid("$serviceName returned HTTP $status.")
                }
            } finally {
                connection.disconnect()
            }
        } catch (e: Exception) {
            Result.Invalid("Network error: ${e.message ?: e.toString()}")
        }
    }
}
