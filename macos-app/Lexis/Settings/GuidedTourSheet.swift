import SwiftUI

/// A short guided tour of Lexis's main features — separate from
/// `OnboardingSheet` (which only collects API keys). Shown automatically
/// once, right after first run, and reachable any time from the Help menu
/// or Settings → General.
struct GuidedTourSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var pageIndex = 0

    private struct Page {
        var icon: String
        var title: String
        var body: String
    }

    private let pages: [Page] = [
        Page(
            icon: "text.book.closed",
            title: "Welcome to Lexis",
            body: "Turn a PDF, photo, or pasted text into a narrated, tap-to-define reading session. In the Library, use Open File\u{2026}, drag a file in, or Paste Text to get started."
        ),
        Page(
            icon: "doc.text.image",
            title: "Two ways to read",
            body: "PDFs and photos open in Original Layout \u{2014} the real page, at its real look, with pinch-to-zoom and drag-to-select-and-copy. Switch to clean, narratable Reflowed Text any time with the toolbar toggle."
        ),
        Page(
            icon: "character.book.closed",
            title: "Look up any word",
            body: "Force-click (or three-finger tap) any word \u{2014} or right-click it \u{2014} for Lexis's own popover: definition, phonetics, translation, and synonyms. Works the same in both reading modes."
        ),
        Page(
            icon: "waveform",
            title: "Listen along",
            body: "Generate narration for a page and follow along as each word highlights in sync. Play, pause, skip, and pick up right where you left off next time."
        ),
        Page(
            icon: "globe",
            title: "Translate & remember",
            body: "Translate any paragraph, get suggested key terms, and bookmark paragraphs to find them later. Every word you look up is saved automatically to Vocabulary."
        ),
        Page(
            icon: "key",
            title: "Your keys, your data",
            body: "No Gemini key? Lexis still works, reading PDFs and photos with on-device OCR \u{2014} free and offline. Add API keys any time in Settings, and optionally back up your library to your own Google Drive."
        ),
    ]

    var body: some View {
        VStack(spacing: 0) {
            Spacer(minLength: 8)

            VStack(spacing: 18) {
                Image(systemName: pages[pageIndex].icon)
                    .font(.system(size: 52, weight: .light))
                    .foregroundStyle(Color.accentColor)
                    .frame(height: 64)

                VStack(spacing: 8) {
                    Text(pages[pageIndex].title)
                        .font(.title2.weight(.semibold))
                    Text(pages[pageIndex].body)
                        .font(.body)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .fixedSize(horizontal: false, vertical: true)
                        .frame(maxWidth: 400)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            pageIndicator

            HStack {
                Button("Skip") { dismiss() }

                Spacer()

                if pageIndex > 0 {
                    Button("Back") { pageIndex -= 1 }
                }
                if pageIndex < pages.count - 1 {
                    Button("Next") { pageIndex += 1 }
                        .keyboardShortcut(.defaultAction)
                } else {
                    Button("Done") { dismiss() }
                        .keyboardShortcut(.defaultAction)
                }
            }
            .padding(.top, 20)
        }
        .padding(28)
        .frame(width: 560, height: 460)
    }

    private var pageIndicator: some View {
        HStack(spacing: 7) {
            ForEach(pages.indices, id: \.self) { index in
                Circle()
                    .fill(index == pageIndex ? Color.accentColor : Color.secondary.opacity(0.3))
                    .frame(width: 7, height: 7)
                    .onTapGesture { pageIndex = index }
            }
        }
        .padding(.top, 20)
    }
}
