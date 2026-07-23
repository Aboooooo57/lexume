#if os(macOS)
import AppKit
import SwiftData
import SwiftUI

/// One non-editable, click-to-define NSTextView per paragraph. Kept
/// per-paragraph (rather than one giant text view for the page) so hover
/// chrome and future per-paragraph actions (bookmark, translate) stay simple,
/// and so each view's reflow cost stays small.
struct ParagraphTextView: NSViewRepresentable {
    let text: String
    let font: NSFont
    let textColor: NSColor
    let sessionID: PersistentIdentifier
    let container: ModelContainer

    /// Karaoke state for this specific paragraph (nil when audio isn't
    /// playing, or this paragraph isn't the active one). Computed by the
    /// caller from the page's single global TokenMap + active token index.
    var activeRange: NSRange?
    var spokenBoundary: Int?
    var activeColor: NSColor = .controlAccentColor
    var spokenColor: NSColor = .secondaryLabelColor

    func makeNSView(context: Context) -> LexumeTextView {
        let textView = LexumeTextView()
        textView.isEditable = false
        textView.isSelectable = true
        textView.drawsBackground = false
        textView.textContainerInset = .zero
        textView.textContainer?.lineFragmentPadding = 0
        apply(to: textView)
        return textView
    }

    func updateNSView(_ nsView: LexumeTextView, context: Context) {
        apply(to: nsView)
    }

    func sizeThatFits(_ proposal: ProposedViewSize, nsView: LexumeTextView, context: Context) -> CGSize? {
        guard let width = proposal.width, width.isFinite, width > 0,
              let textContainer = nsView.textContainer,
              let layoutManager = textContainer.layoutManager
        else { return nil }
        textContainer.containerSize = NSSize(width: width, height: .greatestFiniteMagnitude)
        layoutManager.ensureLayout(for: textContainer)
        let usedRect = layoutManager.usedRect(for: textContainer)
        return CGSize(width: width, height: ceil(usedRect.height))
    }

    private func apply(to textView: LexumeTextView) {
        textView.sessionID = sessionID
        textView.container = container

        let textChanged = textView.string != text
        let fontChanged = textView.appliedFont != font
        let colorChanged = textView.appliedColor != textColor
        if textChanged || fontChanged || colorChanged {
            textView.textStorage?.setAttributedString(
                NSAttributedString(string: text, attributes: [.font: font, .foregroundColor: textColor])
            )
            textView.appliedFont = font
            textView.appliedColor = textColor
        }

        textView.applyKaraoke(
            activeRange: activeRange,
            spokenBoundary: spokenBoundary,
            activeColor: activeColor,
            spokenColor: spokenColor
        )
    }
}
#endif
