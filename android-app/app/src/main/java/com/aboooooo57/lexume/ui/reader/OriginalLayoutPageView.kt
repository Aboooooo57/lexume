package com.aboooooo57.lexume.ui.reader

import android.graphics.Bitmap
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.unit.IntSize
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
 */
@Composable
fun OriginalLayoutPageView(
    image: Bitmap,
    wordBoxes: List<WordBox>,
    onWordTapped: (String) -> Unit,
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

/**
 * Maps a raw tap (in the outer [Box]'s own coordinate space) back through
 * the current pan/zoom and the letterboxed aspect-fit rect to a normalized
 * 0..1 image-space point, then hit-tests it against [wordBoxes]: an exact
 * containing box first, else the nearest box within [TAP_TOLERANCE] as a
 * forgiving fallback for imprecise touch input - mirrors [WordBox]'s own
 * `contains`/`distanceSquaredTo` split.
 */
private fun hitTestWord(
    tap: Offset,
    containerSize: IntSize,
    image: Bitmap,
    scale: Float,
    offset: Offset,
    wordBoxes: List<WordBox>
): String? {
    val fitRect = aspectFitRect(containerSize, image.width, image.height)
    if (fitRect.width <= 0f || fitRect.height <= 0f) return null

    val preTransform = inverseTransform(tap, containerSize, scale, offset)
    val nx = (preTransform.x - fitRect.left) / fitRect.width
    val ny = (preTransform.y - fitRect.top) / fitRect.height
    if (nx < 0f || nx > 1f || ny < 0f || ny > 1f) return null

    wordBoxes.firstOrNull { it.contains(nx, ny) }?.let { return it.word }

    val nearest = wordBoxes.minByOrNull { it.distanceSquaredTo(nx, ny) } ?: return null
    return if (nearest.distanceSquaredTo(nx, ny) <= TAP_TOLERANCE * TAP_TOLERANCE) nearest.word else null
}

private const val MIN_SCALE = 1f
private const val MAX_SCALE = 6f

/** Normalized-space (0..1) snap radius for a near-miss tap - about 2% of the page's shorter dimension. */
private const val TAP_TOLERANCE = 0.02f
