import Foundation

/// Mirrors the free dictionaryapi.dev response shape (only the fields we use).
struct DictionaryEntry: Decodable, Sendable {
    struct Phonetic: Decodable, Sendable {
        var text: String?
        var audio: String?
    }

    struct Definition: Decodable, Sendable {
        var definition: String
        var example: String?
        var synonyms: [String]?
    }

    struct Meaning: Decodable, Sendable {
        var partOfSpeech: String
        var definitions: [Definition]
        var synonyms: [String]?
    }

    var word: String
    var phonetic: String?
    var phonetics: [Phonetic]?
    var meanings: [Meaning]?
}
