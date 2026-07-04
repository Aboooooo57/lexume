import SwiftUI
import SwiftData
import UniformTypeIdentifiers

/// Home screen: the session library. Empty state doubles as the import
/// surface (drop target + open/paste buttons). No landing page — this is
/// what the app shows on launch.
struct LibraryView: View {
    @Query(sort: \ReadingSession.createdAt, order: .reverse)
    private var sessions: [ReadingSession]

    @Environment(\.modelContext) private var modelContext

    @State private var coordinator: ImportCoordinator?
    @State private var path: [PersistentIdentifier] = []
    @State private var isFileImporterPresented = false
    @State private var isPasteSheetPresented = false
    @State private var isDropTargeted = false

    var body: some View {
        NavigationStack(path: $path) {
            Group {
                if sessions.isEmpty {
                    emptyState
                } else {
                    sessionGrid
                }
            }
            .navigationTitle("Library")
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
        }
        .onChange(of: coordinator?.createdSessionID) { _, newValue in
            if let newValue {
                path.append(newValue)
                coordinator?.createdSessionID = nil
            }
        }
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
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 220), spacing: 16)], spacing: 16) {
                ForEach(sessions) { session in
                    NavigationLink(value: session.persistentModelID) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(session.name)
                                .font(.headline)
                                .lineLimit(2)
                            Text(session.createdAt, style: .date)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(.quaternary.opacity(0.5), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(20)
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
