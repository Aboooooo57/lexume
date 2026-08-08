package com.aboooooo57.lexume.support

import android.graphics.Bitmap
import android.graphics.BitmapFactory

/**
 * Decodes a bitmap capped at a maximum dimension instead of at full
 * resolution - an in-focus phone-camera photo is routinely 4000x3000px+
 * even when the JPEG *file* itself is only a couple MB, which decodes to a
 * 40-50MB uncompressed ARGB_8888 bitmap; decoding two of those back to back
 * was enough to OOM-crash a real device (the bug this was extracted from,
 * originally only in `LocalExtractionService`'s on-device OCR path - now
 * shared with Original Layout mode's page viewer, M12, which decodes
 * "image" source-type sessions' original bytes for on-screen display).
 */
object BitmapDownsampler {
    fun decodeSampledBitmap(imageData: ByteArray, maxDimension: Int): Bitmap? =
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
}
