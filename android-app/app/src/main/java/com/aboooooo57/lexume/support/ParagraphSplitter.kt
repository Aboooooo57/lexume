package com.aboooooo57.lexume.support

/** Mirrors `Schema.swift`'s `SessionPage.splitParagraphs`: split on 2+ newlines, trim, drop empties. */
object ParagraphSplitter {
    fun split(text: String): List<String> {
        val groups = mutableListOf<MutableList<String>>()
        for (line in text.split("\r\n", "\r", "\n")) {
            val trimmed = line.trim()
            if (trimmed.isEmpty()) {
                // Only start a new group on the *first* blank line of a run -
                // an empty `groups` (nothing seen yet) or an already-empty
                // last group both mean "don't add another empty group."
                if (groups.isNotEmpty() && groups.last().isNotEmpty()) groups.add(mutableListOf())
            } else {
                if (groups.isEmpty()) groups.add(mutableListOf())
                groups.last().add(line)
            }
        }
        return groups
            .map { it.joinToString("\n").trim() }
            .filter { it.isNotEmpty() }
    }
}
