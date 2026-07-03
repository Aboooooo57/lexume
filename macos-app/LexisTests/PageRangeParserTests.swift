import XCTest
@testable import Lexis

final class PageRangeParserTests: XCTestCase {
    func testSimpleRange() {
        XCTAssertEqual(PageRangeParser.parse("1-3", pageCount: 10), [0, 1, 2])
    }

    func testSingleAndRangeCombined() {
        XCTAssertEqual(PageRangeParser.parse("1-3,5", pageCount: 10), [0, 1, 2, 4])
    }

    func testOutOfBoundsClamped() {
        XCTAssertEqual(PageRangeParser.parse("8-12", pageCount: 10), [7, 8, 9])
    }

    func testUnsortedAndDuplicateInput() {
        XCTAssertEqual(PageRangeParser.parse("5,1-3,3", pageCount: 10), [0, 1, 2, 4])
    }

    func testFormatRoundTrip() {
        XCTAssertEqual(PageRangeParser.format([0, 1, 2, 4]), "1-3,5")
    }

    func testFormatSingletons() {
        XCTAssertEqual(PageRangeParser.format([0, 2, 4]), "1,3,5")
    }

    func testEmptyInput() {
        XCTAssertEqual(PageRangeParser.parse("", pageCount: 10), [])
        XCTAssertEqual(PageRangeParser.format([]), "")
    }
}
