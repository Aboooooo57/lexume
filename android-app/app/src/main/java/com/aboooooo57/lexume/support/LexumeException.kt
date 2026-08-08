package com.aboooooo57.lexume.support

/**
 * Kotlin analog of macOS's `Support/LexumeError.swift` - the one error type
 * used across every service in this app (Room repository, Gemini/ElevenLabs
 * clients, Drive sync, ...), so error UI can show a single consistent
 * message no matter which layer threw.
 */
sealed class LexumeException(message: String) : Exception(message) {
    class MissingApiKey(service: String) :
        LexumeException("$service needs an API key. Add one in Settings.")

    class RateLimited(service: String) :
        LexumeException("$service is rate-limiting requests. Please try again in a minute.")

    class HttpFailure(service: String, status: Int, body: String) :
        LexumeException(
            "$service returned HTTP $status" + if (body.isEmpty()) "" else " — ${body.take(200)}"
        )

    class DecodingFailure(service: String, underlying: String) :
        LexumeException("Couldn't understand $service's response: $underlying")

    object Offline :
        LexumeException("You appear to be offline. Cached sessions remain readable.")

    class NotFound(what: String) :
        LexumeException("$what not found.")

    class DriveSync(message: String) : LexumeException(message)
}
