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

    /// Translations keyed by the exact source text (word/definition/example);
    /// reset whenever the looked-up word changes since a new headword means
    /// new definition/example strings.
    private(set) var translations: [String: String] = [:]
    private(set) var translatingKeys: Set<String> = []
    private(set) var translationErrorKeys: Set<String> = []

    private let sessionID: PersistentIdentifier
    private let dictionary: DictionaryService
    private let translation: TranslationService
    private let persistence: PersistenceActor
    private var audioPlayer: AVPlayer?
    private let speechSynthesizer = AVSpeechSynthesizer()

    init(
        sessionID: PersistentIdentifier,
        container: ModelContainer,
        dictionary: DictionaryService = FreeDictionaryClient(),
        translation: TranslationService = GoogleTranslateClient()
    ) {
        self.sessionID = sessionID
        self.dictionary = dictionary
        self.translation = translation
        self.persistence = PersistenceActor(modelContainer: container)
    }

    var targetLanguage: TargetLanguage {
        TargetLanguage.named(UserDefaults.standard.string(forKey: AppSettings.targetLanguageKey) ?? "Persian")
    }

    func translate(_ text: String) {
        guard translations[text] == nil, !translatingKeys.contains(text) else { return }
        translatingKeys.insert(text)
        translationErrorKeys.remove(text)
        let language = targetLanguage
        let preferGemini = (UserDefaults.standard.string(forKey: AppSettings.translationEngineKey) ?? "google") == "gemini"
        Task {
            do {
                let result = try await translation.translate(text, to: language, preferGemini: preferGemini)
                translations[text] = result
            } catch {
                translationErrorKeys.insert(text)
            }
            translatingKeys.remove(text)
        }
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

    /// Speaks `word` aloud on-device - the fallback used whenever the free
    /// dictionary API has no recorded pronunciation clip for it (common:
    /// its audio coverage is inconsistent), so every word can still be
    /// heard, offline, with no API key required.
    func speakWord(_ word: String) {
        speechSynthesizer.stopSpeaking(at: .immediate)
        let utterance = AVSpeechUtterance(string: word)
        utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        speechSynthesizer.speak(utterance)
    }

    private func fetchCurrent() async {
        let word = currentWord
        guard !word.isEmpty else { return }
        isLoading = true
        errorMessage = nil
        entry = nil
        translations = [:]
        translatingKeys = []
        translationErrorKeys = []
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
