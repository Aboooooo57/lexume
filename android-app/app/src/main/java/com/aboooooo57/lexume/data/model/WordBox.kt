package com.aboooooo57.lexume.data.model

import org.json.JSONArray
import org.json.JSONObject

/**
 * A single word recognized on a rasterized page, with its location so it
 * can be tapped directly on the original page rendering (Original Layout
 * mode, M12) rather than only in the reflowed-text reader. Mirrors
 * `Models/WordBox.swift`, but normalized **top-left origin** (0,0 at the
 * top-left corner, y increasing downward) rather than Vision's normalized
 * bottom-left origin - ML Kit's own `Text.Element.boundingBox` is already
 * top-left/pixel-space, so this avoids a Y-flip only to match a convention
 * nothing else on Android uses (`ocr/MlKitOcrService.kt`'s own doc comment
 * makes the same call for line-gap paragraph splitting). This is a
 * purely local cache (like the Mac app's own - word boxes aren't part of
 * Drive backup on either platform), so there's no cross-platform JSON
 * shape to match here the way `DriveModels.kt` has to.
 */
data class WordBox(val word: String, val left: Float, val top: Float, val right: Float, val bottom: Float) {
    fun contains(x: Float, y: Float): Boolean = x in left..right && y in top..bottom

    /** Squared distance from (x,y) to this box's nearest edge - 0 if the point is already inside. Used to snap a near-miss tap to the closest word. */
    fun distanceSquaredTo(x: Float, y: Float): Float {
        val dx = (x - x.coerceIn(left, right))
        val dy = (y - y.coerceIn(top, bottom))
        return dx * dx + dy * dy
    }

    fun toJson(): JSONObject = JSONObject()
        .put("word", word)
        .put("left", left.toDouble())
        .put("top", top.toDouble())
        .put("right", right.toDouble())
        .put("bottom", bottom.toDouble())

    companion object {
        fun listFromJson(bytes: ByteArray): List<WordBox> {
            val array = JSONArray(String(bytes, Charsets.UTF_8))
            return (0 until array.length()).map { i ->
                val o = array.getJSONObject(i)
                WordBox(
                    word = o.getString("word"),
                    left = o.getDouble("left").toFloat(),
                    top = o.getDouble("top").toFloat(),
                    right = o.getDouble("right").toFloat(),
                    bottom = o.getDouble("bottom").toFloat()
                )
            }
        }

        fun listToJson(boxes: List<WordBox>): ByteArray {
            val array = JSONArray()
            for (box in boxes) array.put(box.toJson())
            return array.toString().toByteArray(Charsets.UTF_8)
        }
    }
}
