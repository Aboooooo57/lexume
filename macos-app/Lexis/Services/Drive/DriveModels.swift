import Foundation

struct DriveFile: Codable, Sendable {
    var id: String
    var name: String
}

struct DriveFileList: Codable, Sendable {
    var files: [DriveFile]
}

/// One vocabulary entry, as mirrored into a session's Drive backup JSON.
struct VocabBackupEntry: Sendable, Codable {
    var word: String
    var createdAt: Date
    var definitionSnippet: String?
}

/// One page's text/timings, as mirrored into a session's Drive backup JSON.
/// Audio itself is uploaded as a separate `.mp3` file (see `hasAudio`) to
/// keep the JSON small.
struct SessionBackupPage: Sendable, Codable {
    var pageNumber: Int
    var title: String?
    var extractedText: String?
    var wordTimingsJSON: Data?
    var hasAudio: Bool
}

/// Everything needed to recreate a `ReadingSession` on another Mac,
/// serialized to `<session-id>.json` in the Drive "Lexis" folder. Keyed by
/// the session's stable `id` (not its SwiftData `PersistentIdentifier`,
/// which isn't portable across stores) so restore can skip sessions that
/// already exist locally.
struct SessionBackupPayload: Sendable, Codable {
    var id: UUID
    var name: String
    var sourceType: String
    var createdAt: Date
    var totalPages: Int
    var lastPage: Int
    var lastAudioPage: Int?
    var lastAudioPosition: Double?
    var selectedPageIndices: [Int]
    var originalFileName: String?
    var sourceMimeType: String?
    var rawSourceText: String?
    var originalDocument: Data?
    var pages: [SessionBackupPage]
    var bookmarks: [String]
    var vocabulary: [VocabBackupEntry]
}
