import AppKit
import SwiftData
import SwiftUI
import UniformTypeIdentifiers

/// Every logged dictionary lookup across all sessions, searchable and
/// exportable to CSV, with a jump back to the session it came from.
struct VocabularyListView: View {
    @Query(sort: \VocabularyEntry.createdAt, order: .reverse)
    private var entries: [VocabularyEntry]

    @State private var searchText = ""
    @State private var path: [PersistentIdentifier] = []

    private var filteredEntries: [VocabularyEntry] {
        guard !searchText.trimmingCharacters(in: .whitespaces).isEmpty else { return entries }
        return entries.filter { $0.word.localizedCaseInsensitiveContains(searchText) }
    }

    var body: some View {
        NavigationStack(path: $path) {
            Group {
                if entries.isEmpty {
                    ContentUnavailableView(
                        "No Words Yet",
                        systemImage: "character.book.closed",
                        description: Text("Words you look up while reading will appear here.")
                    )
                } else if filteredEntries.isEmpty {
                    ContentUnavailableView.search(text: searchText)
                } else {
                    List(filteredEntries) { entry in
                        VStack(alignment: .leading, spacing: 3) {
                            HStack {
                                Text(entry.word)
                                    .font(.headline)
                                Spacer()
                                if let sessionID = entry.session?.persistentModelID {
                                    Button {
                                        path.append(sessionID)
                                    } label: {
                                        Label("Open", systemImage: "arrow.up.forward.square")
                                    }
                                    .buttonStyle(.plain)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                }
                            }
                            if let snippet = entry.definitionSnippet, !snippet.isEmpty {
                                Text(snippet)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(2)
                            }
                            HStack(spacing: 6) {
                                if let sessionName = entry.session?.name {
                                    Text(sessionName)
                                }
                                Text(entry.createdAt, style: .date)
                            }
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                        }
                        .padding(.vertical, 2)
                    }
                }
            }
            .navigationTitle("Vocabulary")
            .searchable(text: $searchText, placement: .toolbar, prompt: "Search words")
            .navigationDestination(for: PersistentIdentifier.self) { id in
                ReaderView(sessionID: id)
            }
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        exportCSV(filteredEntries)
                    } label: {
                        Label("Export CSV", systemImage: "square.and.arrow.up")
                    }
                    .disabled(entries.isEmpty)
                }
            }
        }
    }

    private func exportCSV(_ entries: [VocabularyEntry]) {
        let panel = NSSavePanel()
        panel.nameFieldStringValue = "lexis-vocabulary.csv"
        panel.allowedContentTypes = [.commaSeparatedText]
        panel.begin { response in
            guard response == .OK, let url = panel.url else { return }
            let formatter = ISO8601DateFormatter()
            var csv = "word,date,session,definition\n"
            for entry in entries {
                let row = [
                    csvField(entry.word),
                    csvField(formatter.string(from: entry.createdAt)),
                    csvField(entry.session?.name ?? ""),
                    csvField(entry.definitionSnippet ?? ""),
                ]
                csv += row.joined(separator: ",") + "\n"
            }
            try? csv.write(to: url, atomically: true, encoding: .utf8)
        }
    }

    private func csvField(_ value: String) -> String {
        if value.contains(",") || value.contains("\"") || value.contains("\n") {
            return "\"" + value.replacingOccurrences(of: "\"", with: "\"\"") + "\""
        }
        return value
    }
}
