package com.aboooooo57.lexume.data.repository

import com.aboooooo57.lexume.network.ExtractionServiceFactory
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

/**
 * Lazily extracts and caches page text, deduplicating concurrent requests
 * for the same page - the Android analog of `Services/PageProcessor.swift`'s
 * `textPage`. `audioPage` (M7) and `layoutPage` (the reader's deferred
 * Original Layout Phase 2) aren't ported - neither has anything to call them
 * yet. Dedup uses its own [SupervisorJob]-backed scope, not the caller's -
 * one caller cancelling (e.g. leaving a screen) shouldn't kill an in-flight
 * extraction that a second caller is also waiting on, mirroring the actor's
 * own detached `Task`.
 */
class PageExtractionService(
    private val sessionRepository: SessionRepository,
    private val pdfPageExtractor: PdfPageExtractor,
    private val extractionServiceFactory: ExtractionServiceFactory
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val lock = Mutex()
    private val inflight = mutableMapOf<String, Deferred<PageSnapshot>>()

    suspend fun textPage(sessionId: String, pageNumber: Int, model: String): PageSnapshot {
        val key = "$sessionId:$pageNumber"
        val deferred = lock.withLock {
            inflight.getOrPut(key) { scope.async { extract(sessionId, pageNumber, model) } }
        }
        try {
            return deferred.await()
        } finally {
            lock.withLock { if (inflight[key] === deferred) inflight.remove(key) }
        }
    }

    private suspend fun extract(sessionId: String, pageNumber: Int, model: String): PageSnapshot {
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

    private companion object {
        const val EXTRACTION_TARGET_WIDTH_PX = 1600
    }
}
