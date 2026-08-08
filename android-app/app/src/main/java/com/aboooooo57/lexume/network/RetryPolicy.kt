package com.aboooooo57.lexume.network

import com.aboooooo57.lexume.support.LexumeException
import kotlinx.coroutines.delay
import kotlin.random.Random

/**
 * Thrown by a service call to signal "retry me" - [RetryPolicy] catches this
 * specifically and backs off; any other exception propagates immediately.
 * Mirrors `Services/RetryPolicy.swift`'s `RetryableError.rateLimited`.
 */
class RateLimitedException : Exception()

/** Mirrors `Services/RetryPolicy.swift`: up to 5 attempts, backoff (2^attempt)*2 + jitter seconds. */
object RetryPolicy {
    suspend fun <T> withRetry(serviceName: String, maxAttempts: Int = 5, operation: suspend () -> T): T {
        repeat(maxAttempts) { attempt ->
            try {
                return operation()
            } catch (e: RateLimitedException) {
                if (attempt == maxAttempts - 1) throw LexumeException.RateLimited(serviceName)
                val delaySeconds = Math.pow(2.0, attempt.toDouble()) * 2 + Random.nextDouble()
                delay((delaySeconds * 1000).toLong())
            }
        }
        throw LexumeException.RateLimited(serviceName)
    }
}
