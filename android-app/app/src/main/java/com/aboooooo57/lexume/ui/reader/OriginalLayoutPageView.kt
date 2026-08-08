package com.aboooooo57.lexume.ui.reader

import android.graphics.Bitmap
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import com.aboooooo57.lexume.data.model.WordBox

/**
 * The real page image - pinch-zoom, pan, and tap-a-word-to-define - instead
 * of reflowed text (Original Layout mode, M12). The touch-native analog of
 * `Reader/OriginalLayoutPageView.swift`'s `NSScrollView` + custom
 * `NSView`, built from scratch for Compose since that file is macOS-only
 * even in the reference app (an `NSViewRepresentable`/AppKit type, and the
 * iPad app explicitly defers a touch port - see `ReaderView.swift`'s own
 * comment on `pageBody(vm:)`). **Deliberately narrower scope than the Mac
 * version**: tap-to-define + pinch/pan only, no drag-to-select-and-copy
 * (that needs the Mac view's row-grouped reading-order reconstruction,
 * `recomputeReadingOrder()`/`nearestWordIndex(to:)` - a second, separate
 * gesture surface layered over this one, cut from the initial build; see
 * android-app/README.md).
 *
 * Gestures are read off the *outer*, untransformed [Box] rather than the
 * `graphicsLayer`-scaled [Image] itself, so tap/pinch coordinates always
 * arrive in stable, known units ([containerSize]) - the transform is then
 * inverted manually in [hitTestWord] instead of relying on Compose to
 * adjust hit-test coordinates through an arbitrary `graphicsLayer`, which
 * isn't guaranteed and can't be verified without a device in this sandbox.
 * [highlightedBox], if set, draws a yellow marker over that word's own
 * position - the touch analog of `OriginalLayoutPageView.swift`'s
 * `showLookupHighlight` find-indicator layer, so it's visible *which* word
 * the dictionary sheet below is actually defining.
 */
@Composable
fun OriginalLayoutPageView(
    image: Bitmap,
    wordBoxes: List<WordBox>,
    onWordTapped: (WordBox) -> Unit,
    highlightedBox: WordBox?,
    modifier: Modifier = Modifier
) {
    // Keyed on `image` so switching pages resets zoom/pan instead of
    // carrying the previous page's framing over onto the new one.
    var scale by remember(image) { mutableStateOf(1f) }
    var offset by remember(image) { mutableStateOf(Offset.Zero) }
    var containerSize by remember { mutableStateOf(IntSize.Zero) }

    Box(
        modifier = modifier
            .fillMaxSize()
            .onSizeChanged { containerSize = it }
            .clipToBounds()
            .pointerInput(image) {
                detectTransformGestures { _, pan, zoom, _ ->
                    val newScale = (scale * zoom).coerceIn(MIN_SCALE, MAX_SCALE)
                    scale = newScale
                    offset = clampOffset(offset + pan, newScale, containerSize)
                }
            }
            .pointerInput(image, wordBoxes) {
                detectTapGestures(
                    onDoubleTap = {
                        // Double-tap resets framing - there's no exposed
                        // "zoom to point" here (the pinch gesture doesn't
                        // track a focal point either, see the class doc
                        // comment), so reset-to-fit is the only zoom
                        // shortcut offered, same role Vision's Quick Look
                        // vs. plain pinch split serves less explicitly on
                        // the Mac side.
                        scale = MIN_SCALE
                        offset = Offset.Zero
                    },
                    onTap = { tapPosition ->
                        hitTestWord(tapPosition, containerSize, image, scale, offset, wordBoxes)?.let(onWordTapped)
                    }
                )
            }
    ) {
        Image(
            bitmap = image.asImageBitmap(),
            contentDescription = "Original page image",
            contentScale = ContentScale.Fit,
            modifier = Modifier
                .fillMaxSize()
                .graphicsLayer(
                    scaleX = scale,
                    scaleY = scale,
                    translationX = offset.x,
                    translationY = offset.y
                )
        )

        if (highlightedBox != null) {
            val rect = mapBoxToScreenRect(highlightedBox, containerSize, image, scale, offset)
            if (rect != null) {
                Canvas(modifier = Modifier.fillMaxSize()) {
                    val padding = HIGHLIGHT_PADDING_DP.toPx()
                    val topLeft = Offset(rect.left - padding, rect.top - padding)
                    val size = Size(rect.width + padding * 2, rect.height + padding * 2)
                    drawRoundRect(
                        color = HIGHLIGHT_COLOR.copy(alpha = 0.35f),
                        topLeft = topLeft,
                        size = size,
                        cornerRadius = CornerRadius(HIGHLIGHT_CORNER_RADIUS_DP.toPx())
                    )
                    drawRoundRect(
                        color = HIGHLIGHT_COLOR,
                        topLeft = topLeft,
                        size = size,
                        cornerRadius = CornerRadius(HIGHLIGHT_CORNER_RADIUS_DP.toPx()),
                        style = Stroke(width = HIGHLIGHT_STROKE_DP.toPx())
                    )
                }
            }
        }
    }
}

/** Keeps panning from sliding the (scaled) image past its own edges - an approximation around the container's own bounds, consistent with the pivot-around-center math [inverseTransform] uses for the same box. */
private fun clampOffset(raw: Offset, scale: Float, containerSize: IntSize): Offset {
    if (scale <= 1f) return Offset.Zero
    val maxX = (scale - 1f) * containerSize.width / 2f
    val maxY = (scale - 1f) * containerSize.height / 2f
    return Offset(raw.x.coerceIn(-maxX, maxX), raw.y.coerceIn(-maxY, maxY))
}

/**
 * Replicates what `Image(contentScale = ContentScale.Fit)` does internally:
 * the largest rect of the image's own aspect ratio that fits centered
 * inside [containerSize], letterboxed on whichever axis doesn't fill.
 * Needed because word boxes are normalized against the *image's* own
 * dimensions, not the container's.
 */
private fun aspectFitRect(containerSize: IntSize, imageWidth: Int, imageHeight: Int): Rect {
    if (containerSize.width <= 0 || containerSize.height <= 0 || imageWidth <= 0 || imageHeight <= 0) {
        return Rect(Offset.Zero, Size.Zero)
    }
    val containerAspect = containerSize.width.toFloat() / containerSize.height.toFloat()
    val imageAspect = imageWidth.toFloat() / imageHeight.toFloat()
    return if (imageAspect > containerAspect) {
        val width = containerSize.width.toFloat()
        val height = width / imageAspect
        Rect(Offset(0f, (containerSize.height - height) / 2f), Size(width, height))
    } else {
        val height = containerSize.height.toFloat()
        val width = height * imageAspect
        Rect(Offset((containerSize.width - width) / 2f, 0f), Size(width, height))
    }
}

/** Inverts the [Modifier.graphicsLayer] transform above, which (like Compose's default) pivots around its own center: `screen = center + (pre - center) * scale + translation`. */
private fun inverseTransform(tap: Offset, containerSize: IntSize, scale: Float, offset: Offset): Offset {
    val center = Offset(containerSize.width / 2f, containerSize.height / 2f)
    return Offset(
        x = center.x + (tap.x - center.x - offset.x) / scale,
        y = center.y + (tap.y - center.y - offset.y) / scale
    )
}

/** The forward direction of [inverseTransform]: pre-transform (container-space) point -> on-screen point. */
private fun forwardTransform(pre: Offset, containerSize: IntSize, scale: Float, offset: Offset): Offset {
    val center = Offset(containerSize.width / 2f, containerSize.height / 2f)
    return Offset(
        x = center.x + (pre.x - center.x) * scale + offset.x,
        y = center.y + (pre.y - center.y) * scale + offset.y
    )
}

/**
 * Maps a raw tap (in the outer [Box]'s own coordinate space) back through
 * the current pan/zoom and the letterboxed aspect-fit rect to a normalized
 * 0..1 image-space point, then hit-tests it against [wordBoxes]: an exact
 * containing box first, else the nearest box within [TAP_TOLERANCE] as a
 * forgiving fallback for imprecise touch input - mirrors [WordBox]'s own
 * `contains`/`distanceSquaredTo` split. The matched box's word is
 * [sanitizedWord]'d before it's returned - not just belt-and-suspenders on
 * top of [com.aboooooo57.lexume.ocr.MlKitOcrService]'s own cleanup at
 * recognition time: [wordBoxes] here can also be a page's *cached*
 * word boxes (`SessionRepository`'s `wordBoxesJson`), persisted by an
 * older build before that cleanup existed, which a fresh install of this
 * fix has no way to retroactively re-recognize. Cleaning again here is
 * idempotent for already-clean data and is what actually fixes previously-
 * imported sessions, not just newly-scanned ones.
 */
private fun hitTestWord(
    tap: Offset,
    containerSize: IntSize,
    image: Bitmap,
    scale: Float,
    offset: Offset,
    wordBoxes: List<WordBox>
): WordBox? {
    val fitRect = aspectFitRect(containerSize, image.width, image.height)
    if (fitRect.width <= 0f || fitRect.height <= 0f) return null

    val preTransform = inverseTransform(tap, containerSize, scale, offset)
    val nx = (preTransform.x - fitRect.left) / fitRect.width
    val ny = (preTransform.y - fitRect.top) / fitRect.height
    if (nx < 0f || nx > 1f || ny < 0f || ny > 1f) return null

    wordBoxes.firstOrNull { it.contains(nx, ny) }?.let { return sanitizedWord(it) }

    val nearest = wordBoxes.minByOrNull { it.distanceSquaredTo(nx, ny) } ?: return null
    return if (nearest.distanceSquaredTo(nx, ny) <= TAP_TOLERANCE * TAP_TOLERANCE) sanitizedWord(nearest) else null
}

/** Strips everything but letters/apostrophes from [box]'s word, same filter as `ParagraphText.kt`'s own `wordAt` - null if nothing definable is left (a box that turns out to be pure punctuation). Position fields are untouched, so the highlight still lands on the right spot either way. */
private fun sanitizedWord(box: WordBox): WordBox? {
    val cleaned = box.word.filter { it.isLetter() || it == '\'' }
    return if (cleaned.isEmpty()) null else box.copy(word = cleaned)
}

/** The forward counterpart of [hitTestWord]'s coordinate math: a word box's own normalized rect -> its current on-screen rect, for drawing [highlightedBox]. Null once the aspect-fit rect collapses (container not yet measured). */
private fun mapBoxToScreenRect(box: WordBox, containerSize: IntSize, image: Bitmap, scale: Float, offset: Offset): Rect? {
    val fitRect = aspectFitRect(containerSize, image.width, image.height)
    if (fitRect.width <= 0f || fitRect.height <= 0f) return null

    val preTopLeft = Offset(fitRect.left + box.left * fitRect.width, fitRect.top + box.top * fitRect.height)
    val preBottomRight = Offset(fitRect.left + box.right * fitRect.width, fitRect.top + box.bottom * fitRect.height)
    return Rect(
        forwardTransform(preTopLeft, containerSize, scale, offset),
        forwardTransform(preBottomRight, containerSize, scale, offset)
    )
}

private const val MIN_SCALE = 1f
private const val MAX_SCALE = 6f

/** Normalized-space (0..1) snap radius for a near-miss tap - about 2% of the page's shorter dimension. */
private const val TAP_TOLERANCE = 0.02f

private val HIGHLIGHT_COLOR = Color(0xFFFFC107)
private val HIGHLIGHT_PADDING_DP = 3.dp
private val HIGHLIGHT_CORNER_RADIUS_DP = 3.dp
private val HIGHLIGHT_STROKE_DP = 2.dp
