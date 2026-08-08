package com.aboooooo57.lexume.ui.reader

import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
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
 *
 * [activeRange]/[spokenEndOffset] (both `null` by default - the M6
 * dictionary's own reuse of this composable never sets them) drive M7's
 * karaoke highlighting: a background highlight over the word currently
 * being narrated, and a dimmed color over everything already spoken in
 * this paragraph - mirrors `ParagraphTextView+iOS.swift`'s
 * `applyKaraoke(to:)`.
 */
@Composable
fun ParagraphText(
    text: String,
    onWordTapped: (String) -> Unit,
    modifier: Modifier = Modifier,
    style: TextStyle = LocalTextStyle.current,
    activeRange: IntRange? = null,
    spokenEndOffset: Int? = null,
    activeHighlightColor: Color = MaterialTheme.colorScheme.primary.copy(alpha = 0.28f),
    spokenColor: Color = style.color.copy(alpha = 0.55f)
) {
    var layoutResult by remember { mutableStateOf<TextLayoutResult?>(null) }

    val displayedText = remember(text, activeRange, spokenEndOffset, spokenColor, activeHighlightColor) {
        buildAnnotatedString {
            append(text)
            if (spokenEndOffset != null && spokenEndOffset > 0) {
                addStyle(SpanStyle(color = spokenColor), 0, spokenEndOffset.coerceIn(0, text.length))
            }
            if (activeRange != null) {
                val start = activeRange.first.coerceIn(0, text.length)
                val end = (activeRange.last + 1).coerceIn(start, text.length)
                if (end > start) {
                    addStyle(SpanStyle(background = activeHighlightColor), start, end)
                }
            }
        }
    }

    Text(
        text = displayedText,
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
