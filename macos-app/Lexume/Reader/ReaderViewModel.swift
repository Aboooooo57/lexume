import AppKit
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

    // MARK: - Original Layout mode
    // Independent of the reflowed-text state above: the original page
    // rendering + OCR'd word boxes, used only when the reader toggles into
    // Original Layout mode. Left as-is (not cleared) when the page changes,
    // so the previous page's rendering stays visible until the new one is
    // ready rather than flashing to blank.
    /// Defaults to true for pdf/image sessions (set in `start()`) so opening
    /// one of those never eagerly runs Gemini/OCR extraction — that only
    /// happens once the user actually switches to the reflowed-text view.
    private(set) var isOriginalLayoutMode = false
    private(set) var originalLayoutImage: CGImage?
    private(set) var originalLayoutWordBoxes: [WordBox] = []
    private(set) var isLoadingOriginalLayout = false
    private(set) var originalLayoutError: String?
    private var originalLayoutLoadedPage: Int?

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
        Task { try? await processor.persistence.updateLastPage(sessionID, page: currentPageNumber) }

        // PDF/image sessions default straight to Original Layout — reading
        // the original page needs only on-device OCR, not a Gemini/OCR
        // extraction pass, so there's nothing to gain by running that
        // automatically until the user actually asks for reflowed text.
        if let overview, overview.sourceType == "pdf" || overview.sourceType == "image" {
            isOriginalLayoutMode = true
            loadOriginalLayoutIfNeeded()
        } else {
            await loadCurrentPage()
        }
    }

    /// Called by the reader's mode toggle. Switching to Original Layout is
    /// always cheap (cached or on-device OCR); switching to reflowed text
    /// triggers extraction lazily, only the first time it's needed for
    /// whatever page is currently showing.
    func setOriginalLayoutMode(_ isOn: Bool) {
        guard isOriginalLayoutMode != isOn else { return }
        isOriginalLayoutMode = isOn
        if isOn {
            loadOriginalLayoutIfNeeded()
        } else if currentPage?.pageNumber != currentPageNumber {
            Task { await loadCurrentPage() }
        }
    }

    func goToPage(_ number: Int, autoPlay: Bool = false) {
        guard let overview, number >= 1, number <= overview.totalPages else { return }
        playbackEngine.stop()
        currentPageNumber = number
        Task { try? await processor.persistence.updateLastPage(sessionID, page: number) }
        if isOriginalLayoutMode {
            loadOriginalLayoutIfNeeded()
        } else {
            Task { await loadCurrentPage(autoPlay: autoPlay) }
        }
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

    // MARK: - Original Layout mode

    /// Renders the current page's original image and loads (computing and
    /// caching if needed) its word boxes. Safe to call repeatedly — it's a
    /// no-op once this exact page has already been loaded or is loading.
    func loadOriginalLayoutIfNeeded() {
        guard let overview, overview.sourceType == "pdf" || overview.sourceType == "image" else { return }
        guard originalLayoutLoadedPage != currentPageNumber else { return }
        originalLayoutLoadedPage = currentPageNumber
        isLoadingOriginalLayout = true
        originalLayoutError = nil
        let pageNumber = currentPageNumber
        Task {
            defer { isLoadingOriginalLayout = false }
            do {
                guard let image = Self.renderDisplayImage(overview: overview, pageNumber: pageNumber) else {
                    throw LexumeError.notFound("Page \(pageNumber) image")
                }
                let boxes = try await processor.layoutPage(sessionID: sessionID, pageNumber: pageNumber)
                originalLayoutImage = image
                originalLayoutWordBoxes = boxes
            } catch {
                originalLayoutError = error.localizedDescription
            }
        }
    }

    /// Forces `loadOriginalLayoutIfNeeded` to actually retry the current
    /// page (its dedup guard would otherwise treat this page as "handled").
    func retryOriginalLayout() {
        originalLayoutLoadedPage = nil
        loadOriginalLayoutIfNeeded()
    }

    /// Renders the page's own original bytes — same rasterization the
    /// on-device OCR path uses, so what's displayed and what was OCR'd are
    /// always pixel-aligned. Synchronous: rendering a single page is fast
    /// enough not to need a background hop for this feature's scope.
    private static func renderDisplayImage(overview: SessionOverview, pageNumber: Int) -> CGImage? {
        switch overview.sourceType {
        case "pdf":
            guard let originalDocument = overview.originalDocument,
                  pageNumber >= 1, pageNumber <= overview.selectedPageIndices.count,
                  let pdfPageData = PDFPageExtractor.singlePagePDFData(
                    pageIndex: overview.selectedPageIndices[pageNumber - 1], in: originalDocument
                  )
            else { return nil }
            return PDFPageExtractor.renderImage(fromSinglePagePDF: pdfPageData)
        case "image":
            guard let imageData = overview.originalDocument, let nsImage = NSImage(data: imageData) else { return nil }
            return nsImage.cgImage(forProposedRect: nil, context: nil, hints: nil)
        default:
            return nil
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
