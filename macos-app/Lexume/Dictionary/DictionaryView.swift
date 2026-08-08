import SwiftData
import SwiftUI

/// Content shown in the self-positioned dictionary `NSPanel` — Lexume's own
/// "Look Up" panel.
@MainActor
struct DictionaryView: View {
    let initialWord: String
    let sessionID: PersistentIdentifier?
    let container: ModelContainer
    var onClose: (() -> Void)?

    @State private var viewModel: DictionaryViewModel?

    var body: some View {
        Group {
            if let viewModel {
                content(viewModel)
            } else {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        // Constant 380×340 in EVERY state (spinner, error, loaded) — on the
        // outermost container on purpose. The hosting panel is positioned
        // assuming exactly this size; if the view's ideal size changed
        // between states, the SwiftUI hosting layer could resize (and
        // thereby silently move) the panel when the async lookup lands —
        // that spinner→content transition is precisely where the panel used
        // to end up displaced by the two states' height difference.
        // Compact like the system Look Up panel; content scrolls.
        .frame(width: 380, height: 340)
        // Fully opaque, theme-adaptive surface — deliberately NOT a material.
        // This panel routinely straddles wildly different backdrops (black
        // toolbar above, white PDF page below), and any translucency renders
        // as a blotchy card: darker where it overlaps chrome, washed-out
        // where the paper shines through. A text-dense card needs one
        // uniform surface no matter what's behind it.
        .background(Color.platformWindowBackground)
        // The hosting NSPanel is borderless and transparent, so the card's
        // rounded shape and clipping are drawn here. No SwiftUI .shadow:
        // it can't render outside the window's bounds, so it only smeared a
        // dark rim along the card edge — the panel's own system window
        // shadow (hasShadow) does the real job.
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(Color.platformSeparator)
        )
        .task {
            if viewModel == nil {
                let vm = DictionaryViewModel(sessionID: sessionID, container: container)
                viewModel = vm
                await vm.lookup(initialWord, resetHistory: true)
            }
        }
    }

    @ViewBuilder
    private func content(_ vm: DictionaryViewModel) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            breadcrumb(vm)
            Divider()
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    if vm.isLoading {
                        loadingState(word: vm.currentWord)
                    } else if let error = vm.errorMessage {
                        emptyState(systemImage: "wifi.slash", message: error)
                    } else if let entry = vm.entry {
                        header(entry, vm)
                            .padding(.horizontal, 18)
                            .padding(.top, 16)
                            .padding(.bottom, 12)

                        ForEach(Array((entry.meanings ?? []).prefix(6).enumerated()), id: \.offset) { index, meaning in
                            if index > 0 {
                                Divider().padding(.horizontal, 18)
                            }
                            meaningSection(meaning, vm)
                                .padding(.horizontal, 18)
                                .padding(.vertical, 14)
                        }
                    } else {
                        emptyState(
                            systemImage: "questionmark.circle",
                            message: "No definition found for \u{201C}\(vm.currentWord)\u{201D}."
                        )
                    }
                }
            }
        }
        // Sizing and card chrome live on the outermost container in `body`,
        // shared with the pre-viewModel loading state.
    }

    private func loadingState(word: String) -> some View {
        VStack(spacing: 10) {
            ProgressView()
            Text("Looking up \u{201C}\(word)\u{201D}…")
                .font(.callout)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, minHeight: 200)
    }

    private func emptyState(systemImage: String, message: String) -> some View {
        VStack(spacing: 10) {
            Image(systemName: systemImage)
                .font(.system(size: 28))
                .foregroundStyle(.tertiary)
            Text(message)
                .font(.callout)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, minHeight: 200)
        .padding(.horizontal, 24)
    }

    // MARK: - Breadcrumb bar

    private func breadcrumb(_ vm: DictionaryViewModel) -> some View {
        HStack(spacing: 8) {
            breadcrumbButton(systemImage: "chevron.left", disabled: vm.history.count <= 1) { vm.goBack() }

            ScrollViewReader { proxy in
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 5) {
                        ForEach(Array(vm.history.enumerated()), id: \.offset) { index, word in
                            let isCurrent = index == vm.history.count - 1
                            Button { vm.jump(to: index) } label: {
                                Text(word)
                                    .font(.caption.weight(isCurrent ? .semibold : .regular))
                                    .foregroundStyle(isCurrent ? Color.accentColor : Color.secondary)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 3)
                                    .background(
                                        isCurrent ? Color.accentColor.opacity(0.12) : Color.clear,
                                        in: Capsule()
                                    )
                            }
                            .buttonStyle(.plain)
                            .focusable(false)
                            .id(index)

                            if index < vm.history.count - 1 {
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 9, weight: .semibold))
                                    .foregroundStyle(.tertiary)
                            }
                        }
                    }
                }
                .onAppear {
                    proxy.scrollTo(vm.history.count - 1, anchor: .trailing)
                }
                .onChange(of: vm.history.count) { _, _ in
                    withAnimation {
                        proxy.scrollTo(vm.history.count - 1, anchor: .trailing)
                    }
                }
            }

            Spacer(minLength: 4)

            breadcrumbButton(systemImage: "arrow.counterclockwise", disabled: vm.history.count <= 1) { vm.reset() }

            if let onClose {
                Divider().frame(height: 14)
                breadcrumbButton(systemImage: "xmark", disabled: false, action: onClose)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        // No background of its own — a second material stacked on the card
        // read as a mismatched lighter band; the Divider below is enough to
        // set the bar apart. Minimal.
    }

    private func breadcrumbButton(systemImage: String, disabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(disabled ? Color.secondary.opacity(0.4) : Color.secondary)
                .frame(width: 20, height: 20)
        }
        .buttonStyle(.plain)
        .focusable(false)
        .disabled(disabled)
    }

    // MARK: - Header

    private func header(_ entry: DictionaryEntry, _ vm: DictionaryViewModel) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 10) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(entry.word)
                        .font(.system(size: 22, weight: .bold))
                    if let phonetic = entry.phonetic ?? entry.phonetics?.first(where: { $0.text != nil })?.text {
                        Text(phonetic)
                            .font(.system(.callout, design: .monospaced))
                            .foregroundStyle(.secondary)
                    }
                }
                Spacer()
                Button {
                    if let audioURLString = entry.phonetics?.first(where: { !($0.audio ?? "").isEmpty })?.audio,
                       let url = URL(string: audioURLString) {
                        vm.playPronunciation(url: url)
                    } else {
                        // The free dictionary API's audio coverage is
                        // inconsistent - fall back to on-device speech so
                        // every word can still be heard.
                        vm.speakWord(entry.word)
                    }
                } label: {
                    Image(systemName: "speaker.wave.2.fill")
                        .font(.system(size: 13))
                        .foregroundStyle(Color.accentColor)
                        .frame(width: 30, height: 30)
                        .background(Color.accentColor.opacity(0.12), in: Circle())
                }
                .buttonStyle(.plain)
                .focusable(false)
            }
            translateRow(for: entry.word, vm: vm, font: .callout.weight(.medium))
        }
    }

    // MARK: - Translation

    @ViewBuilder
    private func translateRow(for text: String, vm: DictionaryViewModel, font: Font = .callout) -> some View {
        let isRTL = vm.targetLanguage.isRTL
        VStack(alignment: isRTL ? .trailing : .leading, spacing: 4) {
            Button {
                vm.translate(text)
            } label: {
                HStack(spacing: 4) {
                    if vm.translatingKeys.contains(text) {
                        ProgressView().controlSize(.mini)
                    } else {
                        Image(systemName: "globe")
                    }
                    Text(vm.translations[text] == nil ? "Translate" : vm.targetLanguage.displayName)
                }
                .font(.caption2)
                .foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
            .focusable(false)
            .disabled(vm.translatingKeys.contains(text) || vm.translations[text] != nil)

            if let translated = vm.translations[text] {
                Text(translated)
                    .font(font)
                    .foregroundStyle(.primary)
                    .environment(\.layoutDirection, isRTL ? .rightToLeft : .leftToRight)
                    .multilineTextAlignment(isRTL ? .trailing : .leading)
                    .frame(maxWidth: .infinity, alignment: isRTL ? .trailing : .leading)
            } else if vm.translationErrorKeys.contains(text) {
                Text("Translation failed")
                    .font(.caption2)
                    .foregroundStyle(.red)
            }
        }
    }

    // MARK: - Meanings

    private func meaningSection(_ meaning: DictionaryEntry.Meaning, _ vm: DictionaryViewModel) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(meaning.partOfSpeech.lowercased())
                .font(.caption.weight(.bold))
                .foregroundStyle(Color.accentColor)
                .padding(.horizontal, 8)
                .padding(.vertical, 2)
                .background(Color.accentColor.opacity(0.12), in: Capsule())

            VStack(alignment: .leading, spacing: 10) {
                ForEach(Array(meaning.definitions.prefix(3).enumerated()), id: \.offset) { index, definition in
                    HStack(alignment: .top, spacing: 8) {
                        Text("\(index + 1).")
                            .font(.callout.weight(.medium))
                            .foregroundStyle(.tertiary)
                            .frame(width: 16, alignment: .trailing)
                            .padding(.top, 1)

                        VStack(alignment: .leading, spacing: 4) {
                            ClickableText(text: definition.definition) { word in
                                Task { await vm.lookup(word) }
                            }
                            translateRow(for: definition.definition, vm: vm)

                            if let example = definition.example, !example.isEmpty {
                                ClickableText(text: "\u{201C}\(example)\u{201D}", font: .callout.italic()) { word in
                                    Task { await vm.lookup(word) }
                                }
                                .foregroundStyle(.secondary)
                                translateRow(for: example, vm: vm, font: .callout.italic())
                            }
                        }
                    }
                }
            }

            if let synonyms = meaning.synonyms, !synonyms.isEmpty {
                synonymChips(Array(synonyms.prefix(5)), vm)
            }
        }
    }

    private func synonymChips(_ synonyms: [String], _ vm: DictionaryViewModel) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("SYNONYMS")
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(.tertiary)
                .padding(.top, 4)
            FlowLayout(spacing: 6) {
                ForEach(synonyms, id: \.self) { synonym in
                    Button {
                        Task { await vm.lookup(synonym) }
                    } label: {
                        Text(synonym)
                            .font(.caption)
                            .foregroundStyle(.primary)
                            .padding(.horizontal, 9)
                            .padding(.vertical, 4)
                            .background(Color.secondary.opacity(0.1), in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .focusable(false)
                }
            }
        }
    }
}
