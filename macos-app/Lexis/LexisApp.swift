import SwiftUI
import SwiftData

@main
struct LexisApp: App {
    let container: ModelContainer

    init() {
        do {
            // CloudKit-compatible schema (defaults everywhere, optional
            // relationships, no unique constraints) so cloud sync can be
            // enabled later without a migration.
            container = try ModelContainer(
                for: ReadingSession.self, SessionPage.self, Bookmark.self, VocabularyEntry.self
            )
        } catch {
            fatalError("Failed to create SwiftData container: \(error)")
        }
    }

    var body: some Scene {
        WindowGroup {
            RootView()
        }
        .modelContainer(container)
        .commands {
            CommandGroup(replacing: .newItem) { }
            PlaybackCommands()
        }

        WindowGroup(id: "reader", for: PersistentIdentifier.self) { $sessionID in
            if let sessionID {
                ReaderView(sessionID: sessionID)
                    .frame(minWidth: 640, minHeight: 480)
            }
        }
        .modelContainer(container)
        .commands {
            PlaybackCommands()
        }

        Settings {
            SettingsView()
        }
        .modelContainer(container)
    }
}

/// Space (play/pause) and ⌘←/⌘→ (page navigation), routed to whichever
/// reader window is currently key via `FocusedValues.readerControls`.
struct PlaybackCommands: Commands {
    @FocusedValue(\.readerControls) private var controls

    var body: some Commands {
        CommandMenu("Playback") {
            Button(controls?.isPlaying == true ? "Pause" : "Play") {
                controls?.togglePlayback()
            }
            .keyboardShortcut(.space, modifiers: [])
            .disabled(!(controls?.canTogglePlayback ?? false))

            Divider()

            Button("Previous Page") {
                controls?.previousPage()
            }
            .keyboardShortcut(.leftArrow, modifiers: .command)
            .disabled(!(controls?.canGoToPreviousPage ?? false))

            Button("Next Page") {
                controls?.nextPage()
            }
            .keyboardShortcut(.rightArrow, modifiers: .command)
            .disabled(!(controls?.canGoToNextPage ?? false))
        }
    }
}

/// Sidebar sections of the main window.
enum SidebarItem: String, CaseIterable, Identifiable {
    case library = "Library"
    case vocabulary = "Vocabulary"
    case bookmarks = "Bookmarks"

    var id: String { rawValue }

    var systemImage: String {
        switch self {
        case .library: return "books.vertical"
        case .vocabulary: return "character.book.closed"
        case .bookmarks: return "bookmark"
        }
    }
}

struct RootView: View {
    @State private var selection: SidebarItem? = .library
    @State private var showOnboarding = false
    @State private var pendingImportURL: URL?

    @State private var network = NetworkMonitor.shared

    private let secrets: SecretsStore = KeychainStore()

    var body: some View {
        NavigationSplitView {
            List(SidebarItem.allCases, selection: $selection) { item in
                Label(item.rawValue, systemImage: item.systemImage)
                    .tag(item)
            }
            .navigationSplitViewColumnWidth(min: 180, ideal: 210, max: 280)
        } detail: {
            VStack(spacing: 0) {
                if !network.isOnline {
                    offlineBanner
                }
                switch selection ?? .library {
                case .library:
                    LibraryView(pendingImportURL: $pendingImportURL)
                case .vocabulary:
                    VocabularyListView()
                case .bookmarks:
                    BookmarksListView()
                }
            }
        }
        .frame(minWidth: 900, minHeight: 620)
        .onAppear {
            if secrets.get(.geminiAPIKey) == nil || secrets.get(.elevenLabsAPIKey) == nil {
                showOnboarding = true
            }
        }
        .sheet(isPresented: $showOnboarding) {
            OnboardingSheet()
        }
        .onOpenURL { url in
            selection = .library
            pendingImportURL = url
        }
    }

    private var offlineBanner: some View {
        HStack(spacing: 6) {
            Image(systemName: "wifi.slash")
            Text("You're offline — cached sessions are still readable, but importing, narration, and lookups need a connection.")
        }
        .font(.caption)
        .foregroundStyle(.secondary)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 6)
        .background(.yellow.opacity(0.15))
    }
}
