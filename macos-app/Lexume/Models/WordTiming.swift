import Foundation

/// One spoken word's timing window, in seconds from the start of the audio.
struct WordTiming: Codable, Sendable, Equatable {
    var word: String
    var start: Double
    var end: Double
}
