import Combine
import SwiftUI
import SwiftData

@main
struct LexumeApp: App {
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
            HelpCommands()
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
            HelpCommands()
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
            .keyboardShortcut(.leftArrow, modifiers: [])
            .disabled(!(controls?.canGoToPreviousPage ?? false))

            Button("Next Page") {
                controls?.nextPage()
            }
            .keyboardShortcut(.rightArrow, modifiers: [])
            .disabled(!(controls?.canGoToNextPage ?? false))
        }
    }
}

/// Reopens the guided tour from the Help menu regardless of which window is
/// key — posted to RootView (the only view that owns the tour's presented
/// state) rather than routed through FocusedValues, since "show the tour"
/// isn't scoped to a particular reader window the way playback controls are.
extension Notification.Name {
    static let showGuidedTour = Notification.Name("com.aboooooo57.lexume.showGuidedTour")
}

struct HelpCommands: Commands {
    var body: some Commands {
        CommandGroup(replacing: .help) {
            Button("Lexume Guided Tour") {
                NotificationCenter.default.post(name: .showGuidedTour, object: nil)
            }
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
    @State private var showGuidedTour = false
    @State private var pendingImportURL: URL?

    @State private var network = NetworkMonitor.shared

    @AppStorage(AppSettings.hasSeenGuidedTourKey) private var hasSeenGuidedTour = false
    @AppStorage(AppSettings.hasDismissedOnboardingKey) private var hasDismissedOnboarding = false

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
            if !hasDismissedOnboarding {
                showOnboarding = true
            } else if !hasSeenGuidedTour {
                showGuidedTour = true
            }
        }
        .sheet(isPresented: $showOnboarding, onDismiss: {
            // The tour is about how to use features, independent of whether
            // keys were entered — show it right after key setup finishes
            // (Skip or Save & Start both count) if it hasn't been seen yet.
            if !hasSeenGuidedTour {
                showGuidedTour = true
            }
        }) {
            OnboardingSheet()
        }
        .sheet(isPresented: $showGuidedTour, onDismiss: {
            hasSeenGuidedTour = true
        }) {
            GuidedTourSheet()
        }
        .onReceive(NotificationCenter.default.publisher(for: .showGuidedTour)) { _ in
            // A manual reopen (Help menu / Settings) always shows it, regardless of hasSeenGuidedTour.
            showGuidedTour = true
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
