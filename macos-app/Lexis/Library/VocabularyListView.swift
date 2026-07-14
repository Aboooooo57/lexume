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
    /// Expanded session nodes — empty by default, so the tree starts fully
    /// collapsed and the user opens just the sessions they care about.
    @State private var expandedGroups: Set<PersistentIdentifier?> = []

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
                    // Hand-rolled tree instead of DisclosureGroup: its built-in
                    // chevron pins to the top of a tall two-line label rather
                    // than centering, and there's no supported way to move it.
                    // Drawing the chevron inside the header row centers it for
                    // free and keeps whole-row click-to-toggle.
                    List {
                        ForEach(sessionGroups) { group in
                            let expanded = isSearching || expandedGroups.contains(group.id)
                            groupHeader(group, expanded: expanded)
                            if expanded {
                                ForEach(group.entries) { entry in
                                    wordRow(entry)
                                        .padding(.leading, 40)
                                }
                            }
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
    private func toggleGroup(_ id: PersistentIdentifier?) {
        guard !isSearching else { return }
        // Explicit discards keep the closure unambiguously Void — otherwise
        // Swift infers a result type from insert/remove and warns that
        // withAnimation's returned value is unused.
        withAnimation(.easeInOut(duration: 0.18)) {
            if expandedGroups.contains(id) {
                _ = expandedGroups.remove(id)
            } else {
                _ = expandedGroups.insert(id)
            }
        }
    }

    private func groupHeader(_ group: SessionGroup, expanded: Bool) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.secondary)
                .rotationEffect(.degrees(expanded ? 90 : 0))
                .frame(width: 14)
            Image(systemName: sourceIcon(for: group.sourceType))
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(.secondary)
                .frame(width: 28, height: 28)
                .background(.quaternary.opacity(0.6), in: RoundedRectangle(cornerRadius: 7, style: .continuous))
            VStack(alignment: .leading, spacing: 2) {
                Text(group.name)
                    .font(.headline)
                    .lineLimit(1)
                Text("\(wordCountText(group.entries.count)) · \(group.latestLookup.formatted(date: .abbreviated, time: .omitted))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            if let sessionID = group.id {
                Button {
                    path.append(sessionID)
                } label: {
                    Image(systemName: "arrow.up.forward.square")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
                .help("Open this session in the reader")
            }
        }
        .padding(.vertical, 5)
        // The whole row toggles the node, not just the chevron — the Open
        // button still wins for clicks that land on it.
        .contentShape(Rectangle())
        .onTapGesture {
            toggleGroup(group.id)
        }
    }

    private func wordCountText(_ count: Int) -> String {
        count == 1 ? "1 word" : "\(count) words"
    }

    private func wordRow(_ entry: VocabularyEntry) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(alignment: .firstTextBaseline) {
                Text(entry.word)
                    .font(.body.weight(.medium))
                Spacer()
                Text(entry.createdAt, format: .dateTime.day().month())
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
        .padding(.vertical, 4)
        .padding(.leading, 2)
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
