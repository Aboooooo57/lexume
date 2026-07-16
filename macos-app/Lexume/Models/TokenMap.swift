import Foundation

/// Maps a page's paragraphs to word-level timings for karaoke highlighting.
/// Tokens are built directly from the same text sent to ElevenLabs, using the
/// same whitespace-boundary rule as the char→word aggregation, so token i and
/// timing i line up by construction in the common case. A greedy text-based
/// aligner covers the rare mismatch (ElevenLabs normalizing smart quotes,
/// NBSP, etc.) instead of assuming positional parity like the web app did.
struct TokenMap: Sendable {
    struct Token: Sendable {
        var text: String
        var paragraphIndex: Int
        /// UTF-16-based range within the paragraph string, matching NSRange
        /// indexing used by NSTextStorage/NSLayoutManager.
        var rangeInParagraph: NSRange
        var timingIndex: Int?
    }

    var tokens: [Token]
    var timings: [WordTiming]

    static func build(paragraphs: [String], timings: [WordTiming]) -> TokenMap {
        var tokens: [Token] = []

        for (paragraphIndex, paragraph) in paragraphs.enumerated() {
            var utf16Offset = 0
            var wordStartOffset: Int?
            var wordText = ""

            for character in paragraph {
                let charLength = character.utf16.count
                if character.isWhitespace {
                    if let start = wordStartOffset {
                        let range = NSRange(location: start, length: utf16Offset - start)
                        tokens.append(Token(text: wordText, paragraphIndex: paragraphIndex, rangeInParagraph: range, timingIndex: nil))
                        wordStartOffset = nil
                        wordText = ""
                    }
                } else {
                    if wordStartOffset == nil { wordStartOffset = utf16Offset }
                    wordText.append(character)
                }
                utf16Offset += charLength
            }
            if let start = wordStartOffset {
                let range = NSRange(location: start, length: utf16Offset - start)
                tokens.append(Token(text: wordText, paragraphIndex: paragraphIndex, rangeInParagraph: range, timingIndex: nil))
            }
        }

        if tokens.count == timings.count {
            // Fast path: counts match, assume 1:1 positional alignment.
            for i in tokens.indices { tokens[i].timingIndex = i }
        } else {
            // Greedy fallback: for each token, look for a nearby
            // case-insensitive text match among not-yet-consumed timings. If
            // none is found, leave the token unmatched (nil) and leave the
            // cursor where it is — guessing a timing anyway would silently
            // misassign it and cascade the error onto every later token.
            var timingCursor = 0
            for i in tokens.indices {
                guard timingCursor < timings.count else { break }
                var matched: Int?
                var probe = timingCursor
                while probe < timings.count, probe < timingCursor + 5 {
                    if timings[probe].word.caseInsensitiveCompare(tokens[i].text) == .orderedSame {
                        matched = probe
                        break
                    }
                    probe += 1
                }
                if let matched {
                    tokens[i].timingIndex = matched
                    timingCursor = matched + 1
                }
            }
        }

        return TokenMap(tokens: tokens, timings: timings)
    }

    /// Finds the token whose timing window contains `time`, using `hint` as a
    /// starting point (playback moves forward, so this is usually O(1)).
    func activeTokenIndex(at time: Double, hint: Int?) -> Int? {
        guard !tokens.isEmpty, !timings.isEmpty else { return nil }
        let start = min(max(hint ?? 0, 0), tokens.count - 1)

        var i = start
        while i < tokens.count {
            if let t = timing(for: i) {
                if time < t.start { break }
                if time <= t.end { return i }
            }
            i += 1
        }
        i = start
        while i >= 0 {
            if let t = timing(for: i), time >= t.start, time <= t.end {
                return i
            }
            i -= 1
        }
        return nil
    }

    func timing(for tokenIndex: Int) -> WordTiming? {
        guard tokenIndex >= 0, tokenIndex < tokens.count,
              let timingIndex = tokens[tokenIndex].timingIndex, timingIndex < timings.count
        else { return nil }
        return timings[timingIndex]
    }
}
