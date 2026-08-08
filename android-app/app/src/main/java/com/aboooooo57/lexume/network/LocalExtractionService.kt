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
        // Decoded at full resolution, an in-focus phone-camera photo (often
        // 4000x3000+ px even when the JPEG *file* itself is only a couple MB)
        // easily takes 40-50MB as an uncompressed ARGB_8888 bitmap - decoding
        // two of those back to back was enough to OOM-crash a real device.
        // Downsampling to MAX_DIMENSION_PX first (comfortably more detail
        // than ML Kit's recognizer needs) keeps memory bounded regardless of
        // the source photo's resolution.
        val bitmap = decodeSampledBitmap(imageData, MAX_DIMENSION_PX)
            ?: throw LexumeException.DecodingFailure("On-device OCR", "couldn't decode the image")
        try {
            val text = ocr.recognizeText(bitmap)
            return ExtractedPage(title = deriveTitle(text), text = text)
        } finally {
            bitmap.recycle()
        }
    }

    private fun decodeSampledBitmap(imageData: ByteArray, maxDimension: Int) =
        BitmapFactory.Options().run {
            inJustDecodeBounds = true
            BitmapFactory.decodeByteArray(imageData, 0, imageData.size, this)
            inSampleSize = sampleSize(outWidth, outHeight, maxDimension)
            inJustDecodeBounds = false
            BitmapFactory.decodeByteArray(imageData, 0, imageData.size, this)
        }

    /** Largest power-of-two downsample that keeps the longer side >= maxDimension (BitmapFactory's own "never sample below the target" convention). */
    private fun sampleSize(width: Int, height: Int, maxDimension: Int): Int {
        var sample = 1
        while (maxOf(width, height) / (sample * 2) >= maxDimension) {
            sample *= 2
        }
        return sample
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
