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

    let playbackEngine = PlaybackEngine()

    private let processor: PageProcessor

    init(sessionID: PersistentIdentifier, container: ModelContainer) {
        self.sessionID = sessionID
        self.processor = PageProcessor(container: container, extraction: ExtractionServiceFactory.make(), speech: ElevenLabsClient())

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
        } catch {
            loadError = error.localizedDescription
        }
    }

    private func loadCurrentPage(autoPlay: Bool = false) async {
        isLoadingPage = true
        loadError = nil
        audioError = nil
        hasAudio = false
        tokenMap = nil
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
