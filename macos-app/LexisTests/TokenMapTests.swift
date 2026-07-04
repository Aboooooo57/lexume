import XCTest
@testable import Lexis

final class TokenMapTests: XCTestCase {
    func testBuildAlignsTokensToTimingsWhenCountsMatch() {
        let paragraphs = ["Hello world"]
        let timings = [
            WordTiming(word: "Hello", start: 0.0, end: 0.5),
            WordTiming(word: "world", start: 0.6, end: 1.0),
        ]

        let map = TokenMap.build(paragraphs: paragraphs, timings: timings)

        XCTAssertEqual(map.tokens.count, 2)
        XCTAssertEqual(map.tokens[0].text, "Hello")
        XCTAssertEqual(map.tokens[0].rangeInParagraph, NSRange(location: 0, length: 5))
        XCTAssertEqual(map.tokens[1].text, "world")
        XCTAssertEqual(map.tokens[1].rangeInParagraph, NSRange(location: 6, length: 5))
        XCTAssertEqual(map.tokens[0].timingIndex, 0)
        XCTAssertEqual(map.tokens[1].timingIndex, 1)
    }

    func testBuildTracksParagraphIndices() {
        let paragraphs = ["First paragraph", "Second one"]
        let timings = [
            WordTiming(word: "First", start: 0, end: 0.2),
            WordTiming(word: "paragraph", start: 0.3, end: 0.6),
            WordTiming(word: "Second", start: 0.7, end: 1.0),
            WordTiming(word: "one", start: 1.1, end: 1.3),
        ]

        let map = TokenMap.build(paragraphs: paragraphs, timings: timings)

        XCTAssertEqual(map.tokens.map(\.paragraphIndex), [0, 0, 1, 1])
    }

    func testGreedyAlignerFallbackOnCountMismatch() {
        // ElevenLabs might normalize a smart quote away, leaving one fewer
        // "timing word" than tokens — the aligner should still match by text.
        let paragraphs = ["cat sat mat"]
        let timings = [
            WordTiming(word: "cat", start: 0, end: 0.2),
            WordTiming(word: "mat", start: 0.5, end: 0.7),
        ]

        let map = TokenMap.build(paragraphs: paragraphs, timings: timings)

        XCTAssertEqual(map.tokens.count, 3)
        XCTAssertEqual(map.tokens[0].timingIndex, 0) // "cat" -> timing 0
        XCTAssertEqual(map.tokens[2].timingIndex, 1) // "mat" -> timing 1 (best-effort for "sat")
    }

    func testActiveTokenIndexFindsContainingWindow() {
        let paragraphs = ["one two three"]
        let timings = [
            WordTiming(word: "one", start: 0.0, end: 0.5),
            WordTiming(word: "two", start: 0.5, end: 1.0),
            WordTiming(word: "three", start: 1.0, end: 1.5),
        ]
        let map = TokenMap.build(paragraphs: paragraphs, timings: timings)

        XCTAssertEqual(map.activeTokenIndex(at: 0.2, hint: nil), 0)
        XCTAssertEqual(map.activeTokenIndex(at: 0.75, hint: 0), 1)
        XCTAssertEqual(map.activeTokenIndex(at: 1.4, hint: 1), 2)
    }

    func testActiveTokenIndexHandlesSeekBackward() {
        let paragraphs = ["one two"]
        let timings = [
            WordTiming(word: "one", start: 0.0, end: 0.5),
            WordTiming(word: "two", start: 0.5, end: 1.0),
        ]
        let map = TokenMap.build(paragraphs: paragraphs, timings: timings)

        // Hint says token 1, but the seek landed back in token 0's window.
        XCTAssertEqual(map.activeTokenIndex(at: 0.1, hint: 1), 0)
    }

    func testEmptyTimingsReturnsNilActiveIndex() {
        let map = TokenMap.build(paragraphs: ["hello"], timings: [])
        XCTAssertNil(map.activeTokenIndex(at: 1.0, hint: nil))
    }
}
