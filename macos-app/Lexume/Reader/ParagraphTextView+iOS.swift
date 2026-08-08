#if canImport(UIKit)
import SwiftData
import SwiftUI
import UIKit

/// iPad counterpart to the macOS `ParagraphTextView.swift` (that file stays
/// AppKit/NSTextView-based, and is excluded from this target's membership in
/// Xcode - this file replaces it, same public API, so `ReaderView.swift`'s
/// call site needs no changes). One non-editable, long-press-to-define
/// `UITextView` per paragraph, matching the macOS file's per-paragraph
/// structure (simpler hover chrome, small per-view reflow cost).
///
/// A `View` wrapping a `UIViewRepresentable` internally (rather than being
/// the representable directly), so it can own the `.popover` that shows the
/// looked-up word - iPad's native `.popover` already handles anchor
/// positioning and on-screen clamping, so unlike the macOS version this
/// needs no hand-rolled NSPanel/screen-geometry code at all.
struct ParagraphTextView: View {
    let text: String
    let font: PlatformFont
    let textColor: PlatformColor
    let sessionID: PersistentIdentifier
    let container: ModelContainer

    /// Karaoke state for this specific paragraph (nil when audio isn't
    /// playing, or this paragraph isn't the active one). Computed by the
    /// caller from the page's single global TokenMap + active token index.
    var activeRange: NSRange?
    var spokenBoundary: Int?
    var activeColor: PlatformColor = .tintColor
    var spokenColor: PlatformColor = .secondaryLabel

    @State private var lookupWord: String?

    var body: some View {
        Representable(
            text: text, font: font, textColor: textColor,
            activeRange: activeRange, spokenBoundary: spokenBoundary,
            activeColor: activeColor, spokenColor: spokenColor,
            onLongPressWord: { word in lookupWord = word }
        )
        .popover(item: $lookupWord) { word in
            DictionaryView(
                initialWord: word,
                sessionID: sessionID,
                container: container,
                onClose: { lookupWord = nil }
            )
            .frame(width: 380, height: 340)
        }
    }

    private struct Representable: UIViewRepresentable {
        let text: String
        let font: PlatformFont
        let textColor: PlatformColor
        let activeRange: NSRange?
        let spokenBoundary: Int?
        let activeColor: PlatformColor
        let spokenColor: PlatformColor
        let onLongPressWord: (String) -> Void

        func makeUIView(context: Context) -> UITextView {
            let textView = UITextView()
            textView.isEditable = false
            textView.isSelectable = true
            textView.isScrollEnabled = false
            textView.backgroundColor = .clear
            textView.textContainerInset = .zero
            textView.textContainer.lineFragmentPadding = 0

            let longPress = UILongPressGestureRecognizer(
                target: context.coordinator, action: #selector(Coordinator.handleLongPress(_:))
            )
            longPress.minimumPressDuration = 0.3
            textView.addGestureRecognizer(longPress)
            context.coordinator.textView = textView

            apply(to: textView, coordinator: context.coordinator)
            return textView
        }

        func updateUIView(_ uiView: UITextView, context: Context) {
            apply(to: uiView, coordinator: context.coordinator)
        }

        func makeCoordinator() -> Coordinator {
            Coordinator(onLongPressWord: onLongPressWord)
        }

        func sizeThatFits(_ proposal: ProposedViewSize, uiView: UITextView, context: Context) -> CGSize? {
            guard let width = proposal.width, width.isFinite, width > 0 else { return nil }
            let fitting = uiView.sizeThatFits(CGSize(width: width, height: .greatestFiniteMagnitude))
            return CGSize(width: width, height: ceil(fitting.height))
        }

        private func apply(to textView: UITextView, coordinator: Coordinator) {
            let textChanged = textView.text != text
            let fontChanged = coordinator.appliedFont != font
            let colorChanged = coordinator.appliedColor != textColor
            if textChanged || fontChanged || colorChanged {
                textView.attributedText = NSAttributedString(
                    string: text, attributes: [.font: font, .foregroundColor: textColor]
                )
                coordinator.appliedFont = font
                coordinator.appliedColor = textColor
            }
            applyKaraoke(to: textView)
        }

        /// Mirrors `LexumeTextView.applyKaraoke(...)` on macOS: a background
        /// highlight over the range currently being spoken, plus a lighter
        /// tint over everything spoken so far in this paragraph.
        private func applyKaraoke(to textView: UITextView) {
            guard let layoutManager = textView.layoutManager as NSLayoutManager? else { return }
            let fullRange = NSRange(location: 0, length: (textView.text as NSString).length)
            layoutManager.removeTemporaryAttribute(.backgroundColor, forCharacterRange: fullRange)
            layoutManager.removeTemporaryAttribute(.foregroundColor, forCharacterRange: fullRange)

            if let spokenBoundary, spokenBoundary > 0 {
                let spokenRange = NSRange(location: 0, length: min(spokenBoundary, fullRange.length))
                layoutManager.addTemporaryAttribute(.foregroundColor, value: spokenColor, forCharacterRange: spokenRange)
            }
            if let activeRange, activeRange.location != NSNotFound,
               activeRange.location + activeRange.length <= fullRange.length {
                layoutManager.addTemporaryAttribute(.backgroundColor, value: activeColor.withAlphaComponent(0.28), forCharacterRange: activeRange)
            }
        }
    }

    final class Coordinator: NSObject {
        weak var textView: UITextView?
        var appliedFont: PlatformFont?
        var appliedColor: PlatformColor?
        let onLongPressWord: (String) -> Void

        init(onLongPressWord: @escaping (String) -> Void) {
            self.onLongPressWord = onLongPressWord
        }

        @objc func handleLongPress(_ recognizer: UILongPressGestureRecognizer) {
            guard recognizer.state == .began, let textView else { return }
            let point = recognizer.location(in: textView)
            guard let tapPosition = textView.closestPosition(to: point),
                  let wordRange = textView.tokenizer.rangeEnclosingPosition(
                    tapPosition, with: .word, inDirection: .layout(.left)
                  ),
                  let word = textView.text(in: wordRange)?.trimmingCharacters(in: .whitespacesAndNewlines),
                  !word.isEmpty
            else { return }
            let cleaned = word.filter { $0.isLetter || $0 == "'" }
            guard !cleaned.isEmpty else { return }
            onLongPressWord(cleaned)
        }
    }
}

extension String: @retroactive Identifiable {
    public var id: String { self }
}
#endif
