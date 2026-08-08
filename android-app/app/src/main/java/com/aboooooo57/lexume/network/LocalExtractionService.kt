package com.aboooooo57.lexume.network

import android.graphics.BitmapFactory
import com.aboooooo57.lexume.ocr.MlKitOcrService
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
        val bitmap = BitmapFactory.decodeByteArray(imageData, 0, imageData.size)
            ?: throw LexumeException.DecodingFailure("On-device OCR", "couldn't decode the image")
        val text = ocr.recognizeText(bitmap)
        return ExtractedPage(title = deriveTitle(text), text = text)
    }

    override suspend fun reformat(text: String, model: String): ExtractedPage =
        // No AI available offline - pass pasted/plain-text sources through unchanged.
        ExtractedPage(title = deriveTitle(text), text = text)

    private fun deriveTitle(text: String): String {
        val firstLine = text.lineSequence().firstOrNull { it.isNotBlank() }?.trim().orEmpty()
        return if (firstLine.isEmpty()) "Scanned Page" else firstLine.take(60)
    }
}
