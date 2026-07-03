import AVFoundation
import Foundation
import Observation
import SwiftData

@MainActor
@Observable
final class DictionaryViewModel {
    private(set) var history: [String] = []
    private(set) var entry: DictionaryEntry?
    private(set) var isLoading = false
    private(set) var errorMessage: String?

    var currentWord: String { history.last ?? "" }

    private let sessionID: PersistentIdentifier
    private let dictionary: DictionaryService
    private let persistence: PersistenceActor
    private var audioPlayer: AVPlayer?

    init(
        sessionID: PersistentIdentifier,
        container: ModelContainer,
        dictionary: DictionaryService = FreeDictionaryClient()
    ) {
        self.sessionID = sessionID
        self.dictionary = dictionary
        self.persistence = PersistenceActor(modelContainer: container)
    }

    func lookup(_ word: String, resetHistory: Bool = false) async {
        if resetHistory || history.isEmpty {
            history = [word]
        } else {
            history.append(word)
        }
        await fetchCurrent()
    }

    func jump(to index: Int) {
        guard index >= 0, index < history.count else { return }
        history = Array(history[0...index])
        Task { await fetchCurrent() }
    }

    func goBack() {
        guard history.count > 1 else { return }
        history.removeLast()
        Task { await fetchCurrent() }
    }

    func reset() {
        guard let first = history.first, history.count > 1 else { return }
        history = [first]
        Task { await fetchCurrent() }
    }

    func playPronunciation(url: URL) {
        let player = AVPlayer(url: url)
        audioPlayer = player
        player.play()
    }

    private func fetchCurrent() async {
        let word = currentWord
        guard !word.isEmpty else { return }
        isLoading = true
        errorMessage = nil
        entry = nil
        defer { isLoading = false }
        do {
            let result = try await dictionary.define(word)
            entry = result
            if let result {
                let snippet = result.meanings?.first?.definitions.first?.definition
                try? await persistence.addVocabulary(sessionID, word: word, definitionSnippet: snippet)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
