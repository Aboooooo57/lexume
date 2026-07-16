import XCTest
@testable import Lexume

final class CharToWordTimingTests: XCTestCase {
    func testSimpleSentence() {
        let characters = ["H", "i", " ", "y", "o", "u"]
        let starts = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5]
        let ends = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]

        let words = ElevenLabsClient.charsToWords(characters: characters, starts: starts, ends: ends)

        XCTAssertEqual(words.count, 2)
        XCTAssertEqual(words[0], WordTiming(word: "Hi", start: 0.0, end: 0.2))
        XCTAssertEqual(words[1], WordTiming(word: "you", start: 0.3, end: 0.6))
    }

    func testMultipleSpacesCollapse() {
        let characters = ["A", " ", " ", "B"]
        let starts = [0.0, 0.1, 0.2, 0.3]
        let ends = [0.1, 0.2, 0.3, 0.4]

        let words = ElevenLabsClient.charsToWords(characters: characters, starts: starts, ends: ends)

        XCTAssertEqual(words.count, 2)
        XCTAssertEqual(words[0].word, "A")
        XCTAssertEqual(words[1].word, "B")
    }

    func testTrailingWordWithNoFollowingWhitespace() {
        let characters = ["e", "n", "d"]
        let starts = [1.0, 1.1, 1.2]
        let ends = [1.1, 1.2, 1.3]

        let words = ElevenLabsClient.charsToWords(characters: characters, starts: starts, ends: ends)

        XCTAssertEqual(words, [WordTiming(word: "end", start: 1.0, end: 1.3)])
    }

    func testEmptyInput() {
        XCTAssertEqual(ElevenLabsClient.charsToWords(characters: [], starts: [], ends: []), [])
    }
}
