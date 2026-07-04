import SwiftData
import SwiftUI

/// Every bookmarked paragraph across all sessions, with a jump back to the
/// session (and, once there, the paragraph itself is still visible on the
/// page it was bookmarked from — this view doesn't deep-link to a specific
/// scroll position, just the session).
struct BookmarksListView: View {
    @Query(sort: \Bookmark.createdAt, order: .reverse)
    private var bookmarks: [Bookmark]

    @State private var searchText = ""
    @State private var path: [PersistentIdentifier] = []

    private var filteredBookmarks: [Bookmark] {
        guard !searchText.trimmingCharacters(in: .whitespaces).isEmpty else { return bookmarks }
        return bookmarks.filter { $0.text.localizedCaseInsensitiveContains(searchText) }
    }

    var body: some View {
        NavigationStack(path: $path) {
            Group {
                if bookmarks.isEmpty {
                    ContentUnavailableView(
                        "No Bookmarks Yet",
                        systemImage: "bookmark",
                        description: Text("Paragraphs you bookmark while reading will appear here.")
                    )
                } else if filteredBookmarks.isEmpty {
                    ContentUnavailableView.search(text: searchText)
                } else {
                    List(filteredBookmarks) { bookmark in
                        Button {
                            if let sessionID = bookmark.session?.persistentModelID {
                                path.append(sessionID)
                            }
                        } label: {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(bookmark.text)
                                    .font(.callout)
                                    .foregroundStyle(.primary)
                                    .lineLimit(4)
                                HStack(spacing: 6) {
                                    if let sessionName = bookmark.session?.name {
                                        Label(sessionName, systemImage: "arrow.up.forward.square")
                                    }
                                    Text(bookmark.createdAt, style: .date)
                                }
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                            }
                            .padding(.vertical, 3)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .navigationTitle("Bookmarks")
            .searchable(text: $searchText, placement: .toolbar, prompt: "Search bookmarks")
            .navigationDestination(for: PersistentIdentifier.self) { id in
                ReaderView(sessionID: id)
            }
        }
    }
}
