package com.aboooooo57.lexume.data.repository

import com.aboooooo57.lexume.data.local.SecureKeyStore
import com.aboooooo57.lexume.data.model.WordTiming
import com.aboooooo57.lexume.network.ElevenLabsClient
import com.aboooooo57.lexume.network.ExtractionServiceFactory
import com.aboooooo57.lexume.network.VoiceTuning
import com.aboooooo57.lexume.pdf.PdfPageExtractor
import com.aboooooo57.lexume.pdf.toJpegBytes
import com.aboooooo57.lexume.support.LexumeException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/** Result of an audio synthesis call: audio bytes + per-word timings. Mirrors `PageProcessor.swift`'s `AudioResult`. */
data class AudioResult(val audioData: ByteArray, val timings: List<WordTiming>)

/**
 * Lazily extracts and caches page text/audio, deduplicating concurrent
 * requests for the same page - the Android analog of
 * `Services/PageProcessor.swift`'s `textPage`/`audioPage`. `layoutPage` (the
 * reader's deferred Original Layout Phase 2) isn't ported - nothing calls it
 * yet. Dedup uses its own [SupervisorJob]-backed scope, not the caller's -
 * one caller cancelling (e.g. leaving a screen) shouldn't kill an in-flight
 * extraction that a second caller is also waiting on, mirroring the actor's
 * own detached `Task`.
 */
class PageExtractionService(
    private val sessionRepository: SessionRepository,
    private val pdfPageExtractor: PdfPageExtractor,
    private val extractionServiceFactory: ExtractionServiceFactory,
    private val secureKeyStore: SecureKeyStore
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val lock = Mutex()
    private val textInflight = mutableMapOf<String, Deferred<PageSnapshot>>()
    private val audioInflight = mutableMapOf<String, Deferred<AudioResult>>()

    /** Returns the cached page if present; otherwise extracts it and caches the result. */
    suspend fun textPage(sessionId: String, pageNumber: Int, model: String): PageSnapshot {
        val key = "$sessionId:$pageNumber"
        val deferred = lock.withLock {
            textInflight.getOrPut(key) { scope.async { extractText(sessionId, pageNumber, model) } }
        }
        try {
            return deferred.await()
        } finally {
            lock.withLock { if (textInflight[key] === deferred) textInflight.remove(key) }
        }
    }

    /**
     * Returns cached audio+timings if present; otherwise synthesizes and
     * caches it. The page's text must already be extracted (call
     * [textPage] first).
     */
    suspend fun audioPage(
        sessionId: String,
        pageNumber: Int,
        voiceId: String,
        model: String,
        tuning: VoiceTuning
    ): AudioResult {
        val key = "$sessionId:$pageNumber"
        val deferred = lock.withLock {
            audioInflight.getOrPut(key) { scope.async { extractAudio(sessionId, pageNumber, voiceId, model, tuning) } }
        }
        try {
            return deferred.await()
        } finally {
            lock.withLock { if (audioInflight[key] === deferred) audioInflight.remove(key) }
        }
    }

    private suspend fun extractText(sessionId: String, pageNumber: Int, model: String): PageSnapshot {
        sessionRepository.page(sessionId, pageNumber)?.let { cached ->
            if (!cached.extractedText.isNullOrEmpty()) return cached
        }
        val overview = sessionRepository.overview(sessionId) ?: throw LexumeException.NotFound("Session")
        val extraction = extractionServiceFactory.make()

        val extracted = when (overview.sourceType) {
            "pdf" -> {
                val pageIndex = overview.selectedPageIndices.getOrNull(pageNumber - 1)
                    ?: throw LexumeException.NotFound("Page $pageNumber")
                val originalDocument = overview.originalDocument
                    ?: throw LexumeException.NotFound("Page $pageNumber")
                val bitmap = pdfPageExtractor.renderPage(originalDocument, pageIndex, EXTRACTION_TARGET_WIDTH_PX)
                    ?: throw LexumeException.DecodingFailure("On-device rendering", "couldn't render the page")
                extraction.extractImage(bitmap.toJpegBytes(), "image/jpeg", model)
            }
            "image" -> {
                val imageData = overview.originalDocument
                    ?: throw LexumeException.NotFound("Page $pageNumber")
                extraction.extractImage(imageData, overview.sourceMimeType ?: "image/jpeg", model)
            }
            else -> extraction.reformat(overview.rawSourceText.orEmpty(), model)
        }

        sessionRepository.saveExtractedPage(sessionId, pageNumber, extracted.title, extracted.text)
        return sessionRepository.page(sessionId, pageNumber)
            ?: throw LexumeException.NotFound("Page $pageNumber")
    }

    private suspend fun extractAudio(
        sessionId: String,
        pageNumber: Int,
        voiceId: String,
        model: String,
        tuning: VoiceTuning
    ): AudioResult {
        sessionRepository.page(sessionId, pageNumber)?.let { cached ->
            val audioData = cached.audioData
            val timingsJson = cached.wordTimingsJson
            if (audioData != null && timingsJson != null) {
                val timings = try {
                    WordTiming.listFromJson(timingsJson)
                } catch (e: Exception) {
                    null
                }
                if (timings != null) return AudioResult(audioData, timings)
            }
        }

        val text = sessionRepository.page(sessionId, pageNumber)?.extractedText
        if (text.isNullOrEmpty()) throw LexumeException.NotFound("Page text")

        val result = ElevenLabsClient(secureKeyStore).synthesize(text, voiceId, model, tuning)
        sessionRepository.saveAudio(sessionId, pageNumber, result.audioData, WordTiming.listToJson(result.timings))
        return AudioResult(result.audioData, result.timings)
    }

    private companion object {
        const val EXTRACTION_TARGET_WIDTH_PX = 1600
    }
}
