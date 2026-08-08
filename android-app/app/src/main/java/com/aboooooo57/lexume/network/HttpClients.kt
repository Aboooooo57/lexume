package com.aboooooo57.lexume.network

import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.suspendCancellableCoroutine
import okhttp3.Call
import okhttp3.Callback
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response

/**
 * Single shared OkHttp client for every `network.*` service (Gemini,
 * dictionary, translate) - each maintains its own connection/thread pools,
 * so a separate `OkHttpClient` per service (this file's own first draft)
 * wastes resources for no benefit here.
 */
object HttpClients {
    val shared: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build()
}

/** Bridges an OkHttp async call to a suspend function, returning (status code, response body text). */
suspend fun OkHttpClient.executeSuspending(request: Request): Pair<Int, String> =
    suspendCancellableCoroutine { continuation ->
        val call = newCall(request)
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
