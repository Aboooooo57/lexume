import SwiftUI
import SwiftData

/// Minimal view onto the vocabulary log so Milestone 3's auto-logging is
/// actually visible; per-session grouping, search, and CSV export land in a
/// later milestone.
struct VocabularyListView: View {
    @Query(sort: \VocabularyEntry.createdAt, order: .reverse)
    private var entries: [VocabularyEntry]

    var body: some View {
        Group {
            if entries.isEmpty {
                ContentUnavailableView(
                    "No Words Yet",
                    systemImage: "character.book.closed",
                    description: Text("Words you look up while reading will appear here.")
                )
            } else {
                List(entries) { entry in
                    VStack(alignment: .leading, spacing: 2) {
                        Text(entry.word)
                            .font(.headline)
                        if let snippet = entry.definitionSnippet, !snippet.isEmpty {
                            Text(snippet)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(2)
                        }
                        Text(entry.createdAt, style: .date)
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                    .padding(.vertical, 2)
                }
            }
        }
        .navigationTitle("Vocabulary")
    }
}
