import AppKit
import SwiftData
import SwiftUI
import UniformTypeIdentifiers

/// Every logged dictionary lookup, grouped into an expandable tree — one
/// node per Library session, most recently active first, each listing its
/// words in the order the reader encountered them. Searchable and
/// exportable to CSV, with a jump back to the session a group came from.
struct VocabularyListView: View {
    @Query(sort: \VocabularyEntry.createdAt, order: .reverse)
    private var entries: [VocabularyEntry]

    @State private var searchText = ""
    @State private var path: [PersistentIdentifier] = []
    /// Tracks collapsed (not expanded) groups so new sessions default open.
    @State private var collapsedGroups: Set<PersistentIdentifier?> = []

    private var isSearching: Bool {
        !searchText.trimmingCharacters(in: .whitespaces).isEmpty
    }

    private var filteredEntries: [VocabularyEntry] {
        guard isSearching else { return entries }
        return entries.filter { $0.word.localizedCaseInsensitiveContains(searchText) }
    }

    // MARK: - Session grouping

    private struct SessionGroup: Identifiable {
        let id: PersistentIdentifier?
        let name: String
        let sourceType: String
        let latestLookup: Date
        let entries: [VocabularyEntry]
    }

    /// `filteredEntries` regrouped by session: groups ordered by their most
    /// recent lookup (newest activity on top), words within a group ordered
    /// ascending — the series in the order the reader met them. The nil-ID
    /// bucket is a safety net; the cascade delete rule normally guarantees
    /// entries never outlive their session.
    private var sessionGroups: [SessionGroup] {
        Dictionary(grouping: filteredEntries) { $0.session?.persistentModelID }
            .map { id, groupEntries in
                SessionGroup(
                    id: id,
                    name: groupEntries.first?.session?.name ?? "Deleted Session",
                    sourceType: groupEntries.first?.session?.sourceType ?? "text",
                    latestLookup: groupEntries.map(\.createdAt).max() ?? .distantPast,
                    entries: groupEntries.sorted { $0.createdAt < $1.createdAt }
                )
            }
            .sorted { $0.latestLookup > $1.latestLookup }
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
                    List(sessionGroups) { group in
                        DisclosureGroup(isExpanded: isExpandedBinding(for: group.id)) {
                            ForEach(group.entries) { entry in
                                wordRow(entry)
                            }
                        } label: {
                            groupHeader(group)
                        }
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

    /// While searching, every surviving group is forced open so matches are
    /// never hidden behind a collapsed node; toggles made during a search
    /// are ignored rather than remembered.
    private func isExpandedBinding(for id: PersistentIdentifier?) -> Binding<Bool> {
        Binding(
            get: { isSearching || !collapsedGroups.contains(id) },
            set: { expanded in
                guard !isSearching else { return }
                if expanded {
                    collapsedGroups.remove(id)
                } else {
                    collapsedGroups.insert(id)
                }
            }
        )
    }

    private func groupHeader(_ group: SessionGroup) -> some View {
        HStack(spacing: 8) {
            Image(systemName: sourceIcon(for: group.sourceType))
                .foregroundStyle(.secondary)
            VStack(alignment: .leading, spacing: 2) {
                Text(group.name)
                    .font(.headline)
                    .lineLimit(1)
                HStack(spacing: 10) {
                    Label("\(group.entries.count)", systemImage: "character.book.closed")
                    Text(group.latestLookup, style: .date)
                }
                .font(.caption2)
                .foregroundStyle(.secondary)
            }
            Spacer()
            if let sessionID = group.id {
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
        .padding(.vertical, 2)
    }

    private func wordRow(_ entry: VocabularyEntry) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack {
                Text(entry.word)
                    .font(.body.weight(.semibold))
                Spacer()
                Text(entry.createdAt, style: .date)
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
            if let snippet = entry.definitionSnippet, !snippet.isEmpty {
                Text(snippet)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
        }
        .padding(.vertical, 2)
    }

    private func sourceIcon(for sourceType: String) -> String {
        switch sourceType {
        case "pdf": "doc.text"
        case "image": "photo"
        default: "doc.plaintext"
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
