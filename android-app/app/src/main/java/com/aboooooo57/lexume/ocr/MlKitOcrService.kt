package com.aboooooo57.lexume.ocr

import android.graphics.Bitmap
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.suspendCancellableCoroutine

/**
 * On-device text recognition via ML Kit's Latin-script recognizer - the
 * Android analog of `Services/OCR/VisionOCRService.swift`. Used
 * automatically whenever no Gemini key is configured (see
 * [com.aboooooo57.lexume.network.LocalExtractionService]); free, offline, no
 * account needed.
 *
 * Unlike Vision, ML Kit's base `text-recognition` artifact only covers Latin
 * scripts - Chinese/Japanese/Korean/Devanagari need their own model
 * artifacts (`text-recognition-chinese`/`-japanese`/`-korean`/
 * `-devanagari`), not wired in yet. A configured Gemini key remains the
 * fallback for those scripts in the meantime, same as it is for any user
 * without a Gemini key at all before this milestone existed.
 */
class MlKitOcrService {
    private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

    suspend fun recognizeText(bitmap: Bitmap): String {
        val image = InputImage.fromBitmap(bitmap, 0)
        val text = suspendCancellableCoroutine { continuation ->
            recognizer.process(image)
                .addOnSuccessListener { continuation.resume(it) }
                .addOnFailureListener { continuation.resumeWithException(it) }
        }
        return assembleText(text)
    }

    /**
     * Joins recognized lines top-to-bottom, inserting a paragraph break
     * wherever the vertical gap to the next line is unusually large - same
     * heuristic as `VisionOCRService.assembleText` (there's no AI available
     * offline to reformat this more intelligently). ML Kit's bounding boxes
     * are already top-based pixel coordinates (increasing downward), unlike
     * Vision's normalized bottom-left-origin boxes, so no axis flip is
     * needed here.
     */
    private fun assembleText(text: Text): String {
        data class Line(val text: String, val top: Int, val height: Int)

        val lines = text.textBlocks
            .flatMap { block -> block.lines }
            .mapNotNull { line ->
                val box = line.boundingBox ?: return@mapNotNull null
                Line(line.text, box.top, box.height())
            }
            .sortedBy { it.top }

        if (lines.isEmpty()) return ""

        val builder = StringBuilder(lines.first().text)
        var previousBottom = lines.first().top + lines.first().height
        var previousHeight = lines.first().height

        for (line in lines.drop(1)) {
            val gap = line.top - previousBottom
            builder.append(if (gap > previousHeight * 0.6) "\n\n" else "\n")
            builder.append(line.text)
            previousBottom = line.top + line.height
            previousHeight = line.height
        }
        return builder.toString()
    }
}
