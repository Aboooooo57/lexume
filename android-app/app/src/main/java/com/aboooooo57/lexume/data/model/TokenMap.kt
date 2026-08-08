package com.aboooooo57.lexume.data.model

/**
 * Maps a page's paragraphs to word-level timings for karaoke highlighting.
 * Mirrors `Models/TokenMap.swift`. Token ranges are plain Kotlin `String`
 * indices, which (like Swift's own NSRange-based `rangeInParagraph`) are
 * UTF-16 code-unit offsets - JVM/Kotlin `String`s are UTF-16 internally,
 * same as `NSString`/`NSTextStorage`, so no index-space translation is
 * needed here the way there sometimes is porting from Swift's native
 * grapheme-cluster-based `String` indexing.
 */
data class TokenMap(val tokens: List<Token>, val timings: List<WordTiming>) {
    data class Token(
        val text: String,
        val paragraphIndex: Int,
        val rangeInParagraph: IntRange,
        val timingIndex: Int?
    )

    /**
     * Finds the token whose timing window contains [time], using [hint] as a
     * starting point (playback moves forward, so this is usually O(1)).
     */
    fun activeTokenIndex(time: Double, hint: Int?): Int? {
        if (tokens.isEmpty() || timings.isEmpty()) return null
        val start = (hint ?: 0).coerceIn(0, tokens.size - 1)

        var i = start
        while (i < tokens.size) {
            val t = timing(i)
            if (t != null) {
                if (time < t.start) break
                if (time <= t.end) return i
            }
            i++
        }
        i = start
        while (i >= 0) {
            val t = timing(i)
            if (t != null && time >= t.start && time <= t.end) return i
            i--
        }
        return null
    }

    fun timing(tokenIndex: Int): WordTiming? {
        if (tokenIndex < 0 || tokenIndex >= tokens.size) return null
        val timingIndex = tokens[tokenIndex].timingIndex ?: return null
        if (timingIndex >= timings.size) return null
        return timings[timingIndex]
    }

    companion object {
        fun build(paragraphs: List<String>, timings: List<WordTiming>): TokenMap {
            val tokens = mutableListOf<Token>()

            paragraphs.forEachIndexed { paragraphIndex, paragraph ->
                var wordStart: Int? = null
                val wordText = StringBuilder()

                for (offset in paragraph.indices) {
                    val character = paragraph[offset]
                    if (character.isWhitespace()) {
                        val start = wordStart
                        if (start != null) {
                            tokens.add(Token(wordText.toString(), paragraphIndex, start until offset, null))
                            wordStart = null
                            wordText.clear()
                        }
                    } else {
                        if (wordStart == null) wordStart = offset
                        wordText.append(character)
                    }
                }
                val start = wordStart
                if (start != null) {
                    tokens.add(Token(wordText.toString(), paragraphIndex, start until paragraph.length, null))
                }
            }

            val matchedTokens: List<Token> = if (tokens.size == timings.size) {
                // Fast path: counts match, assume 1:1 positional alignment.
                tokens.mapIndexed { index, token -> token.copy(timingIndex = index) }
            } else {
                // Greedy fallback: for each token, look for a nearby
                // case-insensitive text match among not-yet-consumed
                // timings. If none is found, leave the token unmatched
                // (null) and leave the cursor where it is - guessing a
                // timing anyway would silently misassign it and cascade
                // the error onto every later token.
                var timingCursor = 0
                tokens.map { token ->
                    if (timingCursor >= timings.size) return@map token
                    var matched: Int? = null
                    var probe = timingCursor
                    while (probe < timings.size && probe < timingCursor + 5) {
                        if (timings[probe].word.equals(token.text, ignoreCase = true)) {
                            matched = probe
                            break
                        }
                        probe++
                    }
                    if (matched != null) {
                        timingCursor = matched + 1
                        token.copy(timingIndex = matched)
                    } else {
                        token
                    }
                }
            }

            return TokenMap(matchedTokens, timings)
        }
    }
}
