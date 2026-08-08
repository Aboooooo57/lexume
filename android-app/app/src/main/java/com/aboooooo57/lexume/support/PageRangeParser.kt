package com.aboooooo57.lexume.support

/**
 * Parses/formats the "1-3,5,7-9" page range syntax used by the PDF page
 * picker. Mirrors `Support/PageRangeParser.swift` exactly. Input is 1-based
 * and inclusive; output indices are 0-based, sorted, deduped, and clamped to
 * pageCount.
 */
object PageRangeParser {
    fun parse(text: String, pageCount: Int): List<Int> {
        if (pageCount <= 0) return emptyList()
        val indices = sortedSetOf<Int>()
        for (rawPart in text.split(",")) {
            val part = rawPart.trim()
            if (part.isEmpty()) continue
            val dashIndex = part.indexOf('-')
            if (dashIndex >= 0) {
                val start = part.substring(0, dashIndex).trim().toIntOrNull()
                val end = part.substring(dashIndex + 1).trim().toIntOrNull()
                if (start == null || end == null || start > end) continue
                for (page in start..end) {
                    val index = page - 1
                    if (index in 0 until pageCount) indices.add(index)
                }
            } else {
                val page = part.toIntOrNull() ?: continue
                val index = page - 1
                if (index in 0 until pageCount) indices.add(index)
            }
        }
        return indices.toList()
    }

    fun format(indices: List<Int>): String {
        val sorted = indices.sorted()
        if (sorted.isEmpty()) return ""

        val groups = mutableListOf<MutableList<Int>>()
        for (index in sorted) {
            val lastGroup = groups.lastOrNull()
            if (lastGroup != null && lastGroup.last() == index - 1) {
                lastGroup.add(index)
            } else {
                groups.add(mutableListOf(index))
            }
        }
        return groups.joinToString(",") { group ->
            val start = group.first() + 1
            val end = group.last() + 1
            if (start == end) "$start" else "$start-$end"
        }
    }
}
