import AppKit
import SwiftUI

/// Renders `text` as individually tappable words — used inside dictionary
/// definitions/examples so following a word deeper is one click away. Hovered
/// words underline, tint accent-colored, and switch the cursor to a pointing
/// hand, so it's discoverable that they're clickable before the user clicks.
struct ClickableText: View {
    let text: String
    var font: Font = .body
    var onWordTap: (String) -> Void

    @State private var hoveredIndex: Int?

    private var words: [String] {
        text.split(whereSeparator: \.isWhitespace).map(String.init)
    }

    var body: some View {
        FlowLayout(spacing: 4) {
            ForEach(Array(words.enumerated()), id: \.offset) { index, word in
                wordView(word, isHovered: hoveredIndex == index)
                    .onHover { isHovering in
                        hoveredIndex = isHovering ? index : nil
                        if isHovering {
                            NSCursor.pointingHand.push()
                        } else {
                            NSCursor.pop()
                        }
                    }
                    .onTapGesture {
                        let cleaned = word.filter(\.isLetter).lowercased()
                        guard !cleaned.isEmpty else { return }
                        onWordTap(cleaned)
                    }
            }
        }
    }

    /// Split into two full branches (rather than a ternary) so a hovered
    /// word can switch to an explicit accent Color while a non-hovered word
    /// keeps inheriting whatever style the caller applied (e.g. .secondary
    /// for example sentences) instead of being forced to one fixed style.
    @ViewBuilder
    private func wordView(_ word: String, isHovered: Bool) -> some View {
        if isHovered {
            Text(word)
                .font(font)
                .foregroundStyle(Color.accentColor)
                .underline()
        } else {
            Text(word)
                .font(font)
        }
    }
}
