package com.aboooooo57.lexume.ui.reader

import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.TextStyle
import java.text.BreakIterator

/**
 * A paragraph of reflowed text with tap-to-define word hit-testing - the
 * Android analog of `Reader/ParagraphTextView+iOS.swift`'s long-press +
 * `UITextView.tokenizer` word lookup, adapted per the plan's own tech-stack
 * notes: `Text` + `pointerInput`/`TextLayoutResult.getOffsetForPosition` +
 * `java.text.BreakIterator` in place of `UILongPressGestureRecognizer` +
 * `UITextView.tokenizer`.
 *
 * Deliberately a single **tap**, not a long-press: iOS reserves single-tap
 * on a `UITextView` for cursor placement (it's still technically editable-
 * capable), so word lookup needs a long-press to disambiguate. Compose's
 * plain `Text` isn't a text-editing surface at all, so a tap is unambiguous
 * and matches how most Android reading apps (Play Books, Kindle) already
 * handle word lookup.
 */
@Composable
fun ParagraphText(
    text: String,
    onWordTapped: (String) -> Unit,
    modifier: Modifier = Modifier,
    style: TextStyle = LocalTextStyle.current
) {
    var layoutResult by remember { mutableStateOf<TextLayoutResult?>(null) }

    Text(
        text = text,
        style = style,
        onTextLayout = { layoutResult = it },
        modifier = modifier.pointerInput(text) {
            detectTapGestures { offset ->
                val layout = layoutResult ?: return@detectTapGestures
                val charIndex = layout.getOffsetForPosition(offset)
                wordAt(text, charIndex)?.let(onWordTapped)
            }
        }
    )
}

/**
 * Finds the word boundary containing (or immediately following) [rawIndex]
 * via [BreakIterator], mirroring `UITextView.tokenizer.rangeEnclosingPosition`
 * + the Swift call site's own `word.filter { $0.isLetter || $0 == "'" }`
 * cleanup (rejects taps that landed on whitespace/punctuation - BreakIterator
 * treats those as "words" too).
 */
private fun wordAt(text: String, rawIndex: Int): String? {
    if (text.isEmpty()) return null
    val index = rawIndex.coerceIn(0, text.length - 1)
    val iterator = BreakIterator.getWordInstance()
    iterator.setText(text)
    val end = iterator.following(index)
    if (end == BreakIterator.DONE) return null
    val start = iterator.previous()
    if (start == BreakIterator.DONE || start >= end) return null
    val cleaned = text.substring(start, end).filter { it.isLetter() || it == '\'' }
    return cleaned.ifEmpty { null }
}
