import AppKit
import SwiftData
import SwiftUI

struct ReaderView: View {
    let sessionID: PersistentIdentifier

    @Environment(\.modelContext) private var modelContext
    @State private var viewModel: ReaderViewModel?
    @State private var lastScrolledParagraph: Int?
    @State private var hoveredParagraphIndex: Int?
    @State private var keyTermPopover: String?
    @State private var isFocusMode = false

    @AppStorage(AppSettings.fontFamilyKey) private var fontFamilyRaw = "sans"
    @AppStorage(AppSettings.fontSizeKey) private var fontSize = 18.0
    @AppStorage(AppSettings.readingThemeKey) private var themeRaw = "system"
    @AppStorage(AppSettings.audioModeKey) private var audioMode = "manual"

    private var theme: ReadingTheme { ReadingTheme(rawValue: themeRaw) ?? .system }

    var body: some View {
        Group {
            if let viewModel {
                content(viewModel)
            } else {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .navigationTitle(viewModel?.overview?.name ?? "Reading")
        .background(theme.backgroundColor)
        .task {
            if viewModel == nil {
                let vm = ReaderViewModel(sessionID: sessionID, container: modelContext.container)
                viewModel = vm
                await vm.start()
            }
        }
        .onDisappear {
            if let viewModel, viewModel.hasAudio {
                viewModel.playbackEngine.pause()
            }
        }
        .focusedSceneValue(\.readerControls, readerControls)
    }

    private var readerControls: ReaderControls? {
        guard let viewModel, let overview = viewModel.overview else { return nil }
        return ReaderControls(
            canTogglePlayback: viewModel.hasAudio,
            isPlaying: viewModel.playbackEngine.isPlaying,
            togglePlayback: { viewModel.playbackEngine.toggle() },
            canGoToPreviousPage: viewModel.currentPageNumber > 1,
            canGoToNextPage: viewModel.currentPageNumber < overview.totalPages,
            previousPage: { viewModel.goToPage(viewModel.currentPageNumber - 1) },
            nextPage: { viewModel.goToPage(viewModel.currentPageNumber + 1) }
        )
    }

    @ViewBuilder
    private func content(_ vm: ReaderViewModel) -> some View {
        ZStack(alignment: .topTrailing) {
            VStack(spacing: 0) {
                pageBody(vm)
                if !isFocusMode {
                    Divider()
                }
                if audioMode != "off" {
                    PlayerBarView(vm: vm)
                    if !isFocusMode {
                        Divider()
                    }
                }
                if !isFocusMode {
                    pager(vm)
                }
            }

            if isFocusMode {
                Button {
                    isFocusMode = false
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 22))
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
                .padding(14)
                .help("Exit Focus Mode (Esc)")
            }
        }
        .onExitCommand {
            if isFocusMode { isFocusMode = false }
        }
        .toolbar {
            if vm.overview?.sourceType == "pdf" || vm.overview?.sourceType == "image" {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        vm.setOriginalLayoutMode(!vm.isOriginalLayoutMode)
                    } label: {
                        Image(systemName: vm.isOriginalLayoutMode ? "text.alignleft" : "doc.text.image")
                    }
                    .help(vm.isOriginalLayoutMode ? "Show Reflowed Text" : "Show Original Layout")
                }
            }
            ToolbarItem(placement: .primaryAction) {
                Button {
                    isFocusMode.toggle()
                } label: {
                    Image(systemName: isFocusMode ? "arrow.down.right.and.arrow.up.left" : "arrow.up.left.and.arrow.down.right")
                }
                .help(isFocusMode ? "Exit Focus Mode (Esc)" : "Enter Focus Mode")
                .keyboardShortcut("f", modifiers: [.command, .shift])
            }
        }
        .confirmationDialog(
            "Generate narration for this page?",
            isPresented: Binding(
                get: { vm.pendingAudioConfirmationCharCount != nil },
                set: { if !$0 { vm.cancelPendingAudioGeneration() } }
            ),
            titleVisibility: .visible
        ) {
            Button("Generate Audio") { vm.confirmPendingAudioGeneration() }
            Button("Cancel", role: .cancel) { vm.cancelPendingAudioGeneration() }
        } message: {
            if let count = vm.pendingAudioConfirmationCharCount {
                Text("This page is \(count) characters — about \(estimatedCost(for: count)) with ElevenLabs. Continue?")
            }
        }
    }

    @ViewBuilder
    private func pageBody(_ vm: ReaderViewModel) -> some View {
        if vm.isOriginalLayoutMode {
            originalLayoutBody(vm)
        } else if vm.isLoadingPage {
            ProgressView("Extracting page \(vm.currentPageNumber)…")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let error = vm.loadError {
            VStack(spacing: 12) {
                Image(systemName: "exclamationmark.triangle")
                    .font(.title)
                    .foregroundStyle(.secondary)
                Text(error)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 420)
                Button("Retry") { vm.retry() }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding()
        } else if vm.currentPage != nil {
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        if let title = vm.currentPage?.title, !title.isEmpty {
                            Text(title)
                                .font(.title.weight(.semibold))
                                .foregroundStyle(theme.foregroundColor)
                        }
                        ForEach(Array(vm.paragraphs.enumerated()), id: \.offset) { index, paragraph in
                            paragraphRow(index: index, paragraph: paragraph, vm: vm)
                                .id(index)
                        }
                    }
                    .frame(maxWidth: 760, alignment: .leading)
                    .padding(32)
                    .frame(maxWidth: .infinity)
                }
                .onChange(of: vm.playbackEngine.activeTokenIndex) { _, _ in
                    scrollToActiveParagraph(vm, proxy: proxy)
                }
            }
        } else {
            ContentUnavailableView("No content", systemImage: "doc.text")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    /// The original page rendering with clickable word regions, instead of
    /// reflowed text — same Lexume dictionary popover, anchored to the word's
    /// real position on the page. No narration/translate/key-terms chrome
    /// here; those depend on the reflowed paragraph structure this mode
    /// deliberately bypasses.
    @ViewBuilder
    private func originalLayoutBody(_ vm: ReaderViewModel) -> some View {
        if vm.isLoadingOriginalLayout && vm.originalLayoutImage == nil {
            ProgressView("Reading page \(vm.currentPageNumber)…")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let error = vm.originalLayoutError, vm.originalLayoutImage == nil {
            VStack(spacing: 12) {
                Image(systemName: "exclamationmark.triangle")
                    .font(.title)
                    .foregroundStyle(.secondary)
                Text(error)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 420)
                Button("Retry") { vm.retryOriginalLayout() }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding()
        } else if let image = vm.originalLayoutImage {
            VStack(spacing: 0) {
                // OriginalLayoutPageView wraps its own NSScrollView (pinch-to-zoom
                // + pan), so it should fill the available space directly rather
                // than sit inside another SwiftUI ScrollView.
                OriginalLayoutPageView(
                    image: image,
                    wordBoxes: vm.originalLayoutWordBoxes,
                    sessionID: sessionID,
                    container: modelContext.container
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity)

                if vm.originalLayoutWordBoxes.isEmpty {
                    Text("No text detected on this page.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.vertical, 6)
                }
            }
        } else {
            ContentUnavailableView("No content", systemImage: "doc.text.image")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    @ViewBuilder
    private func paragraphRow(index: Int, paragraph: String, vm: ReaderViewModel) -> some View {
        let karaoke = karaokeState(for: index, vm: vm)
        let isBookmarked = vm.isBookmarked(paragraph)
        let showsChrome = hoveredParagraphIndex == index || isBookmarked

        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 6) {
                ParagraphTextView(
                    text: paragraph,
                    font: readerNSFont,
                    textColor: NSColor(theme.foregroundColor),
                    sessionID: sessionID,
                    container: modelContext.container,
                    activeRange: karaoke.activeRange,
                    spokenBoundary: karaoke.spokenBoundary
                )

                VStack(spacing: 6) {
                    Button {
                        vm.toggleBookmark(paragraph)
                    } label: {
                        Image(systemName: isBookmarked ? "bookmark.fill" : "bookmark")
                    }
                    .help("Bookmark this paragraph")

                    Button {
                        vm.requestParagraphTranslation(index: index, text: paragraph)
                    } label: {
                        if vm.translatingParagraphIndices.contains(index) {
                            ProgressView().controlSize(.small)
                        } else {
                            Image(systemName: "globe")
                        }
                    }
                    .help("Translate this paragraph")
                    .disabled(vm.paragraphTranslations[index] != nil || vm.translatingParagraphIndices.contains(index))

                    Button {
                        vm.requestKeyTerms(index: index, text: paragraph)
                    } label: {
                        if vm.loadingKeyTermIndices.contains(index) {
                            ProgressView().controlSize(.small)
                        } else {
                            Image(systemName: "sparkles")
                        }
                    }
                    .help("Suggest key terms")
                    .disabled(vm.paragraphKeyTerms[index] != nil || vm.loadingKeyTermIndices.contains(index))
                }
                .buttonStyle(.plain)
                .foregroundStyle(.secondary)
                .font(.system(size: 13))
                .opacity(showsChrome ? 1 : 0)
                .frame(width: 20)
            }
            .onHover { hovering in
                hoveredParagraphIndex = hovering ? index : (hoveredParagraphIndex == index ? nil : hoveredParagraphIndex)
            }

            if let translated = vm.paragraphTranslations[index] {
                let isRTL = vm.targetLanguageIsRTL
                Text(translated)
                    .font(readerFont)
                    .foregroundStyle(theme.foregroundColor.opacity(0.85))
                    .environment(\.layoutDirection, isRTL ? .rightToLeft : .leftToRight)
                    .multilineTextAlignment(isRTL ? .trailing : .leading)
                    .frame(maxWidth: .infinity, alignment: isRTL ? .trailing : .leading)
                    .padding(.leading, isRTL ? 0 : 10)
                    .padding(.trailing, isRTL ? 10 : 0)
                    .overlay(alignment: isRTL ? .trailing : .leading) {
                        Rectangle().fill(Color.secondary.opacity(0.3)).frame(width: 2)
                    }
            }

            if let error = vm.paragraphTranslationErrors[index] {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
            }

            if let terms = vm.paragraphKeyTerms[index], !terms.isEmpty {
                keyTermChips(terms, paragraphIndex: index)
            }
        }
    }

    private func keyTermChips(_ terms: [String], paragraphIndex: Int) -> some View {
        FlowLayout(spacing: 6) {
            ForEach(terms, id: \.self) { term in
                // Composite key: the same suggested word can appear in more
                // than one paragraph, and each chip needs its own popover state.
                let key = "\(paragraphIndex):\(term)"
                Button {
                    keyTermPopover = key
                } label: {
                    Text(term)
                        .font(.caption)
                        .padding(.horizontal, 9)
                        .padding(.vertical, 4)
                        .background(Color.accentColor.opacity(0.12), in: Capsule())
                }
                .buttonStyle(.plain)
                .popover(isPresented: Binding(
                    get: { keyTermPopover == key },
                    set: { if !$0 { keyTermPopover = nil } }
                )) {
                    DictionaryView(
                        initialWord: term,
                        sessionID: sessionID,
                        container: modelContext.container,
                        onClose: { keyTermPopover = nil }
                    )
                }
            }
        }
    }

    private var readerFont: Font {
        switch fontFamilyRaw {
        case "serif": return .system(size: fontSize, design: .serif)
        case "mono": return .system(size: fontSize, design: .monospaced)
        default: return .system(size: fontSize, design: .default)
        }
    }

    private func scrollToActiveParagraph(_ vm: ReaderViewModel, proxy: ScrollViewProxy) {
        guard let tokenMap = vm.tokenMap,
              let activeIndex = vm.playbackEngine.activeTokenIndex,
              activeIndex < tokenMap.tokens.count
        else { return }
        let paragraphIndex = tokenMap.tokens[activeIndex].paragraphIndex
        guard paragraphIndex != lastScrolledParagraph else { return }
        lastScrolledParagraph = paragraphIndex
        withAnimation(.easeInOut(duration: 0.3)) {
            proxy.scrollTo(paragraphIndex, anchor: .center)
        }
    }

    /// Per-paragraph karaoke state derived from the page's single global
    /// TokenMap + the currently active token index.
    private func karaokeState(for paragraphIndex: Int, vm: ReaderViewModel) -> (activeRange: NSRange?, spokenBoundary: Int?) {
        guard let tokenMap = vm.tokenMap,
              let activeIndex = vm.playbackEngine.activeTokenIndex,
              activeIndex < tokenMap.tokens.count
        else { return (nil, nil) }

        let activeToken = tokenMap.tokens[activeIndex]
        if paragraphIndex < activeToken.paragraphIndex {
            guard paragraphIndex < vm.paragraphs.count else { return (nil, nil) }
            let length = (vm.paragraphs[paragraphIndex] as NSString).length
            return (nil, length)
        } else if paragraphIndex == activeToken.paragraphIndex {
            return (activeToken.rangeInParagraph, activeToken.rangeInParagraph.location)
        } else {
            return (nil, nil)
        }
    }

    private func estimatedCost(for charCount: Int) -> String {
        String(format: "$%.2f", Double(charCount) / 1000.0 * 0.12)
    }

    @ViewBuilder
    private func pager(_ vm: ReaderViewModel) -> some View {
        HStack {
            Button {
                vm.goToPage(vm.currentPageNumber - 1)
            } label: {
                Image(systemName: "chevron.left")
            }
            .disabled(vm.currentPageNumber <= 1)

            Spacer()
            Text("Page \(vm.currentPageNumber) of \(vm.overview?.totalPages ?? 1)")
                .font(.callout)
                .foregroundStyle(.secondary)
            Spacer()

            Button {
                vm.goToPage(vm.currentPageNumber + 1)
            } label: {
                Image(systemName: "chevron.right")
            }
            .disabled(vm.currentPageNumber >= (vm.overview?.totalPages ?? 1))
        }
        .padding(12)
    }

    private var readerNSFont: NSFont {
        switch fontFamilyRaw {
        case "serif": return NSFont(name: "Georgia", size: fontSize) ?? NSFont.systemFont(ofSize: fontSize)
        case "mono": return NSFont.monospacedSystemFont(ofSize: fontSize, weight: .regular)
        default: return NSFont.systemFont(ofSize: fontSize)
        }
    }
}
