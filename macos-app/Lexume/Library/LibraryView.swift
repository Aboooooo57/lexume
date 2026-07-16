import SwiftUI
import SwiftData
import UniformTypeIdentifiers

/// Home screen: the session library. Empty state doubles as the import
/// surface (drop target + open/paste buttons). No landing page — this is
/// what the app shows on launch.
@MainActor
struct LibraryView: View {
    @Binding var pendingImportURL: URL?

    @Query(sort: \ReadingSession.createdAt, order: .reverse)
    private var sessions: [ReadingSession]

    @Environment(\.modelContext) private var modelContext
    @Environment(\.openWindow) private var openWindow

    @State private var coordinator: ImportCoordinator?
    @State private var path: [PersistentIdentifier] = []
    @State private var isFileImporterPresented = false
    @State private var isPasteSheetPresented = false
    @State private var isDropTargeted = false
    @State private var searchText = ""
    @State private var sessionPendingRename: ReadingSession?
    @State private var renameText = ""
    @State private var sessionPendingDelete: ReadingSession?

    private var filteredSessions: [ReadingSession] {
        guard !searchText.trimmingCharacters(in: .whitespaces).isEmpty else { return sessions }
        return sessions.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }

    var body: some View {
        withImportUI(navigationContent)
    }

    // Split out of `body` because the combined chain (NavigationStack +
    // toolbar + every sheet/alert/confirmationDialog + onAppear/onChange)
    // made the type checker time out ("unable to type-check this expression
    // in reasonable time"). Two independently-typed expressions instead of
    // one giant one.
    private var navigationContent: some View {
        NavigationStack(path: $path) {
            Group {
                if sessions.isEmpty {
                    emptyState
                } else {
                    sessionGrid
                }
            }
            .navigationTitle("Library")
            .searchable(text: $searchText, placement: .toolbar, prompt: "Search sessions")
            .navigationDestination(for: PersistentIdentifier.self) { id in
                ReaderView(sessionID: id)
            }
            .toolbar {
                ToolbarItemGroup(placement: .primaryAction) {
                    Button {
                        isPasteSheetPresented = true
                    } label: {
                        Label("Paste Text", systemImage: "doc.on.clipboard")
                    }
                    Button {
                        isFileImporterPresented = true
                    } label: {
                        Label("Open File…", systemImage: "folder.badge.plus")
                    }
                    .keyboardShortcut("o", modifiers: .command)
                }
            }
        }
        .onAppear {
            if coordinator == nil {
                coordinator = ImportCoordinator(container: modelContext.container)
            }
            if let pendingImportURL {
                coordinator?.handlePickedFile(url: pendingImportURL)
                self.pendingImportURL = nil
            }
        }
        .onChange(of: coordinator?.createdSessionID) { _, newValue in
            if let newValue {
                path.append(newValue)
                coordinator?.createdSessionID = nil
            }
        }
        .onChange(of: pendingImportURL) { _, newValue in
            if let newValue {
                coordinator?.handlePickedFile(url: newValue)
                pendingImportURL = nil
            }
        }
    }

    @ViewBuilder
    private func withImportUI<Content: View>(_ content: Content) -> some View {
        content
            .fileImporter(
                isPresented: $isFileImporterPresented,
                allowedContentTypes: [
                    .pdf, .plainText, .text, UTType(filenameExtension: "md") ?? .plainText,
                    .jpeg, .png,
                    UTType(filenameExtension: "heic") ?? .image,
                    UTType(filenameExtension: "heif") ?? .image,
                ],
                allowsMultipleSelection: false
            ) { result in
                if case .success(let urls) = result, let url = urls.first {
                    coordinator?.handlePickedFile(url: url)
                }
            }
            .sheet(isPresented: $isPasteSheetPresented) {
                PasteTextSheet { text in
                    coordinator?.startPastedText(text)
                }
            }
            .sheet(isPresented: Binding(
                get: { isSelectingPages },
                set: { if !$0 { coordinator?.cancelSelection() } }
            )) {
                if let coordinator, case .selectingPages(_, let pageCount) = coordinator.stage,
                   let data = coordinator.pdfDataForSelection {
                    PDFPageSelectorView(
                        pdfData: data,
                        pageCount: pageCount,
                        selectedIndices: Binding(
                            get: { coordinator.selectedIndices },
                            set: { coordinator.setSelectedIndices($0) }
                        ),
                        onConfirm: { coordinator.confirmPageSelection() },
                        onCancel: { coordinator.cancelSelection() }
                    )
                }
            }
            .alert(
                "Couldn't Import",
                isPresented: Binding(
                    get: { errorMessage != nil },
                    set: { if !$0 { coordinator?.dismissError() } }
                )
            ) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(errorMessage ?? "")
            }
            .alert("Rename Session", isPresented: Binding(
                get: { sessionPendingRename != nil },
                set: { if !$0 { sessionPendingRename = nil } }
            )) {
                TextField("Name", text: $renameText)
                Button("Save") {
                    sessionPendingRename?.name = renameText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                        ? (sessionPendingRename?.name ?? "Untitled")
                        : renameText.trimmingCharacters(in: .whitespacesAndNewlines)
                    try? modelContext.save()
                    sessionPendingRename = nil
                }
                Button("Cancel", role: .cancel) { sessionPendingRename = nil }
            }
            .confirmationDialog(
                "Delete this session?",
                isPresented: Binding(
                    get: { sessionPendingDelete != nil },
                    set: { if !$0 { sessionPendingDelete = nil } }
                ),
                titleVisibility: .visible
            ) {
                Button("Delete", role: .destructive) {
                    if let session = sessionPendingDelete {
                        modelContext.delete(session)
                        try? modelContext.save()
                    }
                    sessionPendingDelete = nil
                }
                Button("Cancel", role: .cancel) { sessionPendingDelete = nil }
            } message: {
                Text("This deletes the extracted text, narration, bookmarks, and vocabulary for \u{201C}\(sessionPendingDelete?.name ?? "")\u{201D}. This can't be undone.")
            }
    }

    private var isSelectingPages: Bool {
        if case .selectingPages = coordinator?.stage { return true }
        return false
    }

    private var errorMessage: String? {
        if case .error(let message) = coordinator?.stage { return message }
        return nil
    }

    private var emptyState: some View {
        VStack(spacing: 28) {
            Spacer()

            VStack(spacing: 10) {
                Image(systemName: "text.book.closed")
                    .font(.system(size: 52, weight: .light))
                    .foregroundStyle(.secondary)
                Text("Read anything, learn every word")
                    .font(.title2.weight(.semibold))
                Text("Drop a PDF, photo, text, or Markdown file here to turn it into a narrated, tap-to-define reading session.")
                    .font(.callout)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 420)
            }

            VStack(spacing: 12) {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(style: StrokeStyle(lineWidth: 1.5, dash: [7, 6]))
                    .foregroundStyle(isDropTargeted ? Color.accentColor : Color(nsColor: .tertiaryLabelColor))
                    .frame(maxWidth: 460, minHeight: 130)
                    .overlay {
                        VStack(spacing: 6) {
                            Image(systemName: "arrow.down.doc")
                                .font(.title2)
                            Text("Drop a file here")
                                .font(.callout.weight(.medium))
                            Text("PDF · JPG · PNG · HEIC · TXT · MD")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .onDrop(of: [.fileURL], isTargeted: $isDropTargeted, perform: handleDrop)

                HStack(spacing: 12) {
                    Button {
                        isFileImporterPresented = true
                    } label: {
                        Label("Open File…", systemImage: "folder")
                    }

                    Button {
                        isPasteSheetPresented = true
                    } label: {
                        Label("Paste Text", systemImage: "doc.on.clipboard")
                    }
                }
                .controlSize(.large)
            }

            Spacer()
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(24)
        .onDrop(of: [.fileURL], isTargeted: $isDropTargeted, perform: handleDrop)
    }

    private var sessionGrid: some View {
        ScrollView {
            if filteredSessions.isEmpty {
                ContentUnavailableView.search(text: searchText)
                    .padding(.top, 60)
            } else {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 220), spacing: 16)], spacing: 16) {
                    ForEach(filteredSessions) { session in
                        NavigationLink(value: session.persistentModelID) {
                            sessionCard(session)
                        }
                        .buttonStyle(.plain)
                        .contextMenu {
                            Button("Open in New Window") {
                                openWindow(id: "reader", value: session.persistentModelID)
                            }
                            Divider()
                            Button("Rename…") {
                                renameText = session.name
                                sessionPendingRename = session
                            }
                            Button("Delete…", role: .destructive) {
                                sessionPendingDelete = session
                            }
                        }
                    }
                }
                .padding(20)
            }
        }
        .onDrop(of: [.fileURL], isTargeted: $isDropTargeted, perform: handleDrop)
        .overlay {
            if isDropTargeted {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(Color.accentColor, lineWidth: 3)
                    .padding(6)
                    .allowsHitTesting(false)
            }
        }
    }

    private func sessionCard(_ session: ReadingSession) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(session.name)
                .font(.headline)
                .lineLimit(2)
            Text(session.createdAt, style: .date)
                .font(.caption)
                .foregroundStyle(.secondary)

            Spacer(minLength: 4)

            HStack(spacing: 10) {
                Label("\(session.lastPage)/\(session.totalPages)", systemImage: "doc.text")
                if let count = session.bookmarks?.count, count > 0 {
                    Label("\(count)", systemImage: "bookmark.fill")
                }
                if let count = session.vocabulary?.count, count > 0 {
                    Label("\(count)", systemImage: "character.book.closed")
                }
            }
            .font(.caption2)
            .foregroundStyle(.secondary)
            .labelStyle(.titleAndIcon)
        }
        .padding(14)
        .frame(maxWidth: .infinity, minHeight: 92, alignment: .leading)
        .background(.quaternary.opacity(0.5), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private func handleDrop(providers: [NSItemProvider]) -> Bool {
        guard let provider = providers.first(where: { $0.canLoadObject(ofClass: URL.self) }) else { return false }
        _ = provider.loadObject(ofClass: URL.self) { url, _ in
            guard let url else { return }
            Task { @MainActor in
                coordinator?.handlePickedFile(url: url)
            }
        }
        return true
    }
}
