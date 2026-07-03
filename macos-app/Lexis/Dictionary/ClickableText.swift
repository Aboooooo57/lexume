import SwiftUI

/// Renders `text` as individually tappable words — used inside dictionary
/// definitions/examples so following a word deeper is one click away.
struct ClickableText: View {
    let text: String
    var font: Font = .body
    var onWordTap: (String) -> Void

    private var words: [String] {
        text.split(whereSeparator: \.isWhitespace).map(String.init)
    }

    var body: some View {
        FlowLayout(spacing: 4) {
            ForEach(Array(words.enumerated()), id: \.offset) { _, word in
                Text(word)
                    .font(font)
                    .onTapGesture {
                        let cleaned = word.filter(\.isLetter).lowercased()
                        guard !cleaned.isEmpty else { return }
                        onWordTap(cleaned)
                    }
            }
        }
    }
}
