package com.aboooooo57.lexume.network

import com.aboooooo57.lexume.ocr.MlKitOcrService
import com.aboooooo57.lexume.support.BitmapDownsampler
import com.aboooooo57.lexume.support.LexumeException

/**
 * The no-Gemini-key extraction path: reads PDFs and photos entirely
 * on-device via ML Kit, free and offline. Mirrors
 * `Services/LocalExtractionService.swift`. There's no AI available to clean
 * the result up, so text passes through close to raw - paragraph breaks
 * come from [MlKitOcrService]'s own line-gap grouping.
 */
class LocalExtractionService(private val ocr: MlKitOcrService) : ExtractionService {
    override suspend fun extractImage(imageData: ByteArray, mimeType: String, model: String): ExtractedPage {
        // Downsampling first (comfortably more detail than ML Kit's
        // recognizer needs) keeps memory bounded regardless of the source
        // photo's resolution - see BitmapDownsampler's own doc comment for
        // why this matters.
        val bitmap = BitmapDownsampler.decodeSampledBitmap(imageData, MAX_DIMENSION_PX)
            ?: throw LexumeException.DecodingFailure("On-device OCR", "couldn't decode the image")
        try {
            val text = ocr.recognizeText(bitmap)
            return ExtractedPage(title = deriveTitle(text), text = text)
        } finally {
            bitmap.recycle()
        }
    }

    override suspend fun reformat(text: String, model: String): ExtractedPage =
        // No AI available offline - pass pasted/plain-text sources through unchanged.
        ExtractedPage(title = deriveTitle(text), text = text)

    private fun deriveTitle(text: String): String {
        val firstLine = text.lineSequence().firstOrNull { it.isNotBlank() }?.trim().orEmpty()
        return if (firstLine.isEmpty()) "Scanned Page" else firstLine.take(60)
    }

    private companion object {
        const val MAX_DIMENSION_PX = 2000
    }
}
