package com.aboooooo57.lexume.support

import java.text.BreakIterator

/**
 * Extracts the single word most worth looking up from a raw string that may
 * actually be more than one dictionary word glued together with punctuation
 * - e.g. ML Kit's word-granularity OCR elements (`ocr/MlKitOcrService.kt`'s
 * `recognizeWordBoxes`), which only split on whitespace, so a hyphenated
 * compound like "asset-class" arrives as a single element even though
 * [BreakIterator] (the same tokenizer `ui/reader/ParagraphText.kt`'s
 * position-based `wordAt` already uses for reflowed text) treats the hyphen
 * as its own boundary. Naively stripping every non-letter character from a
 * string like that mangles "asset-class" into the meaningless "assetclass"
 * instead of recognizing it as two real, separately-definable words - this
 * instead walks [BreakIterator]'s own word boundaries and returns the
 * longest all-letters(+apostrophe) token found, since that's the one most
 * likely to actually have a dictionary entry. Null if [raw] has no such
 * token at all (it was pure punctuation/whitespace to begin with).
 */
object WordTokenizer {
    fun primaryWord(raw: String): String? {
        if (raw.isEmpty()) return null
        val iterator = BreakIterator.getWordInstance()
        iterator.setText(raw)
        var start = iterator.first()
        var end = iterator.next()
        var best: String? = null
        while (end != BreakIterator.DONE) {
            val token = raw.substring(start, end).filter { it.isLetter() || it == '\'' }
            if (token.isNotEmpty() && (best == null || token.length > best.length)) {
                best = token
            }
            start = end
            end = iterator.next()
        }
        return best
    }
}
