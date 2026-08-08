package com.aboooooo57.lexume.ocr

import android.graphics.Bitmap
import com.aboooooo57.lexume.data.model.WordBox
import com.aboooooo57.lexume.support.WordTokenizer
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
 * account needed. Also backs Original Layout mode's word boxes (M12,
 * [recognizeWordBoxes]) - that path always uses on-device OCR, even with a
 * Gemini key configured, since only an OCR engine (never Gemini) can say
 * *where* a word sits on the page, same reasoning `WordBoxRecognizer.swift`
 * documents on the Mac side.
 *
 * Unlike Vision, ML Kit's base `text-recognition` artifact only covers Latin
 * scripts - Chinese/Japanese/Korean/Devanagari need their own model
 * artifacts (`text-recognition-chinese`/`-japanese`/`-korean`/
 * `-devanagari`), not wired in yet. A configured Gemini key remains the
 * fallback for those scripts in the meantime, same as it is for any user
 * without a Gemini key at all before this milestone existed - though
 * Original Layout mode's word boxes have no such fallback (there's nothing
 * else that can produce them), so a page in an unsupported script simply
 * shows no tappable words there.
 */
class MlKitOcrService {
    private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

    suspend fun recognizeText(bitmap: Bitmap): String = assembleText(recognize(bitmap))

    /**
     * Per-word bounding boxes, normalized 0..1 against the bitmap's own
     * dimensions (top-left origin - see [WordBox]'s doc comment). ML Kit's
     * `Element` is roughly word-granularity (space-separated, same as
     * Vision's per-word boxes on the Mac side) but, unlike
     * `ui/reader/ParagraphText.kt`'s own position-based `wordAt`, an element
     * can itself glue more than one real word together with punctuation
     * ("asset-class", "there,") since ML Kit only splits on whitespace -
     * [WordTokenizer.primaryWord] pulls out the one word most worth looking
     * up (see its own doc comment for why that's not just stripping
     * punctuation character-by-character). Elements with no bounding box
     * (rare, but the type is nullable) or with no definable word at all
     * (pure punctuation) are skipped rather than made tappable.
     */
    suspend fun recognizeWordBoxes(bitmap: Bitmap): List<WordBox> {
        val text = recognize(bitmap)
        val width = bitmap.width.toFloat()
        val height = bitmap.height.toFloat()
        if (width <= 0 || height <= 0) return emptyList()

        return text.textBlocks
            .flatMap { block -> block.lines }
            .flatMap { line -> line.elements }
            .mapNotNull { element ->
                val box = element.boundingBox ?: return@mapNotNull null
                val word = WordTokenizer.primaryWord(element.text) ?: return@mapNotNull null
                WordBox(
                    word = word,
                    left = box.left / width,
                    top = box.top / height,
                    right = box.right / width,
                    bottom = box.bottom / height
                )
            }
    }

    private suspend fun recognize(bitmap: Bitmap): Text {
        val image = InputImage.fromBitmap(bitmap, 0)
        return suspendCancellableCoroutine { continuation ->
            recognizer.process(image)
                .addOnSuccessListener { continuation.resume(it) }
                .addOnFailureListener { continuation.resumeWithException(it) }
        }
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
