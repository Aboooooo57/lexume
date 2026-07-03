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
        }

        Settings {
            SettingsView()
        }
        .modelContainer(container)
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

    private let secrets: SecretsStore = KeychainStore()

    var body: some View {
        NavigationSplitView {
            List(SidebarItem.allCases, selection: $selection) { item in
                Label(item.rawValue, systemImage: item.systemImage)
                    .tag(item)
            }
            .navigationSplitViewColumnWidth(min: 180, ideal: 210, max: 280)
        } detail: {
            switch selection ?? .library {
            case .library:
                LibraryView()
            case .vocabulary:
                VocabularyListView()
            case .bookmarks:
                ComingSoonView(
                    title: "Bookmarks",
                    systemImage: "bookmark",
                    message: "Paragraphs you bookmark while reading will appear here."
                )
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
    }
}

/// Placeholder detail for sections that ship in a later milestone.
struct ComingSoonView: View {
    let title: String
    let systemImage: String
    let message: String

    var body: some View {
        ContentUnavailableView {
            Label(title, systemImage: systemImage)
        } description: {
            Text(message)
        }
    }
}
