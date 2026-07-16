import Foundation
import CoreGraphics

/// A single word recognized on a rasterized page, with its location so a
/// word can be tapped directly on the original page rendering (Original
/// Layout mode) rather than only in the reflowed-text reader.
struct WordBox: Codable, Sendable {
    var word: String
    /// Normalized 0...1, Vision's bottom-left-origin convention.
    var boundingBox: CGRect
}
