import Foundation
import Observation
import SwiftData

@MainActor
@Observable
final class ReaderViewModel {
    let sessionID: PersistentIdentifier

    private(set) var overview: SessionOverview?
    private(set) var currentPage: PageSnapshot?
    private(set) var paragraphs: [String] = []
    var currentPageNumber: Int = 1
    private(set) var isLoadingPage = false
    private(set) var loadError: String?

    private(set) var tokenMap: TokenMap?
    private(set) var hasAudio = false
    private(set) var isGeneratingAudio = false
    private(set) var audioError: String?
    /// Non-nil while the >3000-char confirmation sheet should be shown; holds the char count.
    private(set) var pendingAudioConfirmationCharCount: Int?

    private(set) var bookmarkedParagraphs: Set<String> = []
    private(set) var paragraphTranslations: [Int: String] = [:]
    private(set) var translatingParagraphIndices: Set<Int> = []
    private(set) var paragraphTranslationErrors: [Int: String] = [:]
    private(set) var paragraphKeyTerms: [Int: [String]] = [:]
    private(set) var loadingKeyTermIndices: Set<Int> = []

    let playbackEngine = PlaybackEngine()

    private let processor: PageProcessor
    private let translationService: TranslationService
    private let extractionService: ExtractionService

    init(sessionID: PersistentIdentifier, container: ModelContainer) {
        self.sessionID = sessionID
        let extraction = ExtractionServiceFactory.make()
        self.extractionService = extraction
        self.translationService = GoogleTranslateClient()
        self.processor = PageProcessor(container: container, extraction: extraction, speech: ElevenLabsClient())

        playbackEngine.onPersistPosition = { [weak self] position in
            guard let self else { return }
            Task { try? await self.processor.persistence.updateAudioPosition(self.sessionID, page: self.currentPageNumber, position: position) }
        }
        playbackEngine.onFinished = { [weak self] in
            guard let self, let overview = self.overview, self.currentPageNumber < overview.totalPages else { return }
            self.goToPage(self.currentPageNumber + 1, autoPlay: true)
        }
    }

    static let longPageCharThreshold = 3000

    /// Set only while a pending confirmation is showing, so confirming can
    /// still auto-play if the request that triggered it (e.g. auto-advance) wanted to.
    private var pendingAutoPlay = false

    func start() async {
        await reloadOverview()
        if let overview {
            currentPageNumber = max(1, min(overview.lastPage, overview.totalPages))
        }
        await loadCurrentPage()
    }

    func goToPage(_ number: Int, autoPlay: Bool = false) {
        guard let overview, number >= 1, number <= overview.totalPages else { return }
        playbackEngine.stop()
        currentPageNumber = number
        Task { await loadCurrentPage(autoPlay: autoPlay) }
    }

    func retry() {
        Task { await loadCurrentPage() }
    }

    /// Called by the "Generate Audio" button; gates long pages behind confirmation.
    func requestGenerateAudio(autoPlay: Bool = false) {
        let charCount = paragraphs.joined().count
        if charCount > Self.longPageCharThreshold {
            pendingAudioConfirmationCharCount = charCount
            pendingAutoPlay = autoPlay
        } else {
            Task { await generateAudio(autoPlay: autoPlay) }
        }
    }

    func confirmPendingAudioGeneration() {
        pendingAudioConfirmationCharCount = nil
        let autoPlay = pendingAutoPlay
        pendingAutoPlay = false
        Task { await generateAudio(autoPlay: autoPlay) }
    }

    func cancelPendingAudioGeneration() {
        pendingAudioConfirmationCharCount = nil
    }

    /// Persists the exact current position immediately (bypasses the ≤15s
    /// throttle) — used on page/window close.
    func persistPositionNow() {
        guard hasAudio else { return }
        let position = playbackEngine.currentTime
        Task { try? await processor.persistence.updateAudioPosition(sessionID, page: currentPageNumber, position: position) }
    }

    private func reloadOverview() async {
        do {
            overview = try await processor.persistence.overview(sessionID)
            bookmarkedParagraphs = Set(overview?.bookmarkedTexts ?? [])
        } catch {
            loadError = error.localizedDescription
        }
    }

    // MARK: - Bookmarks

    func isBookmarked(_ paragraph: String) -> Bool {
        bookmarkedParagraphs.contains(paragraph)
    }

    func toggleBookmark(_ paragraph: String) {
        // Optimistic update so the button responds instantly.
        if bookmarkedParagraphs.contains(paragraph) {
            bookmarkedParagraphs.remove(paragraph)
        } else {
            bookmarkedParagraphs.insert(paragraph)
        }
        Task {
            _ = try? await processor.persistence.toggleBookmark(sessionID, text: paragraph)
        }
    }

    // MARK: - Paragraph translation

    func requestParagraphTranslation(index: Int, text: String) {
        guard paragraphTranslations[index] == nil, !translatingParagraphIndices.contains(index) else { return }
        translatingParagraphIndices.insert(index)
        paragraphTranslationErrors[index] = nil
        let language = TargetLanguage.named(UserDefaults.standard.string(forKey: AppSettings.targetLanguageKey) ?? "Persian")
        let preferGemini = (UserDefaults.standard.string(forKey: AppSettings.translationEngineKey) ?? "google") == "gemini"
        Task {
            defer { translatingParagraphIndices.remove(index) }
            do {
                paragraphTranslations[index] = try await translationService.translate(text, to: language, preferGemini: preferGemini)
            } catch {
                paragraphTranslationErrors[index] = error.localizedDescription
            }
        }
    }

    var targetLanguageIsRTL: Bool {
        TargetLanguage.named(UserDefaults.standard.string(forKey: AppSettings.targetLanguageKey) ?? "Persian").isRTL
    }

    // MARK: - Key terms

    func requestKeyTerms(index: Int, text: String) {
        guard paragraphKeyTerms[index] == nil, !loadingKeyTermIndices.contains(index) else { return }
        loadingKeyTermIndices.insert(index)
        let model = UserDefaults.standard.string(forKey: AppSettings.geminiModelKey) ?? AppSettings.defaultGeminiModel
        Task {
            defer { loadingKeyTermIndices.remove(index) }
            if let terms = try? await extractionService.keyTerms(in: text, model: model, maxTerms: 6) {
                paragraphKeyTerms[index] = terms
            }
        }
    }

    private func loadCurrentPage(autoPlay: Bool = false) async {
        isLoadingPage = true
        loadError = nil
        audioError = nil
        hasAudio = false
        tokenMap = nil
        // Keyed by paragraph index within the page, so stale entries from a
        // different page must not leak in.
        paragraphTranslations = [:]
        translatingParagraphIndices = []
        paragraphTranslationErrors = [:]
        paragraphKeyTerms = [:]
        loadingKeyTermIndices = []
        playbackEngine.stop()
        defer { isLoadingPage = false }
        do {
            let model = UserDefaults.standard.string(forKey: AppSettings.geminiModelKey) ?? AppSettings.defaultGeminiModel
            let page = try await processor.textPage(sessionID: sessionID, pageNumber: currentPageNumber, model: model)
            currentPage = page
            paragraphs = SessionPage.splitParagraphs(page.extractedText ?? "")
            try await processor.persistence.updateLastPage(sessionID, page: currentPageNumber)

            if let audioData = page.audioData, let timingsData = page.wordTimingsJSON,
               let timings = try? JSONDecoder().decode([WordTiming].self, from: timingsData) {
                loadIntoPlaybackEngine(audioData: audioData, timings: timings, autoPlay: autoPlay)
            } else {
                let audioMode = UserDefaults.standard.string(forKey: AppSettings.audioModeKey) ?? "manual"
                if audioMode == "auto" {
                    requestGenerateAudio(autoPlay: autoPlay)
                }
            }
        } catch {
            loadError = error.localizedDescription
        }
    }

    private func generateAudio(autoPlay: Bool = false) async {
        guard !isGeneratingAudio else { return }
        isGeneratingAudio = true
        audioError = nil
        defer { isGeneratingAudio = false }
        do {
            let defaults = UserDefaults.standard
            let model = defaults.string(forKey: AppSettings.elevenModelKey) ?? AppSettings.defaultElevenModel
            let voiceID = defaults.string(forKey: AppSettings.voiceIDKey) ?? AppSettings.defaultVoiceID
            let tuning = VoiceTuning(
                stability: (defaults.object(forKey: AppSettings.stabilityKey) as? Double) ?? 0.5,
                similarityBoost: (defaults.object(forKey: AppSettings.similarityBoostKey) as? Double) ?? 0.75,
                style: (defaults.object(forKey: AppSettings.styleKey) as? Double) ?? 0.0,
                speed: (defaults.object(forKey: AppSettings.speedKey) as? Double) ?? 1.0
            )
            let result = try await processor.audioPage(
                sessionID: sessionID, pageNumber: currentPageNumber, voiceID: voiceID, model: model, tuning: tuning
            )
            loadIntoPlaybackEngine(audioData: result.audioData, timings: result.timings, autoPlay: autoPlay)
        } catch {
            audioError = error.localizedDescription
        }
    }

    private func loadIntoPlaybackEngine(audioData: Data, timings: [WordTiming], autoPlay: Bool = false) {
        let map = TokenMap.build(paragraphs: paragraphs, timings: timings)
        tokenMap = map
        let resumeAt: Double? = (overview?.lastAudioPage == currentPageNumber) ? overview?.lastAudioPosition : nil
        do {
            try playbackEngine.load(audioData: audioData, tokenMap: map, resumeAt: resumeAt)
            hasAudio = true
            if autoPlay {
                playbackEngine.play()
            }
        } catch {
            audioError = "Couldn't load audio: \(error.localizedDescription)"
        }
    }
}
