import SwiftUI
import SwiftData

/// Home screen: the session library. Empty state doubles as the import
/// surface (drop target + open/paste buttons). Import wiring lands in the
/// next milestone; the buttons explain that for now.
struct LibraryView: View {
    @Query(sort: \ReadingSession.createdAt, order: .reverse)
    private var sessions: [ReadingSession]

    @State private var importUnavailableMessage: String?

    var body: some View {
        Group {
            if sessions.isEmpty {
                emptyState
            } else {
                sessionGrid
            }
        }
        .navigationTitle("Library")
        .alert(
            "Import is coming next",
            isPresented: Binding(
                get: { importUnavailableMessage != nil },
                set: { if !$0 { importUnavailableMessage = nil } }
            )
        ) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(importUnavailableMessage ?? "")
        }
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
                Text("Drop a PDF, text, or Markdown file here to turn it into a narrated, tap-to-define reading session.")
                    .font(.callout)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 420)
            }

            VStack(spacing: 12) {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(style: StrokeStyle(lineWidth: 1.5, dash: [7, 6]))
                    .foregroundStyle(.tertiary)
                    .frame(maxWidth: 460, minHeight: 130)
                    .overlay {
                        VStack(spacing: 6) {
                            Image(systemName: "arrow.down.doc")
                                .font(.title2)
                            Text("Drop a file here")
                                .font(.callout.weight(.medium))
                            Text("PDF · TXT · MD")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }

                HStack(spacing: 12) {
                    Button {
                        importUnavailableMessage = "File import arrives in the next milestone. This build verifies the app shell and your API keys."
                    } label: {
                        Label("Open File…", systemImage: "folder")
                    }
                    .keyboardShortcut("o", modifiers: .command)

                    Button {
                        importUnavailableMessage = "Pasting text arrives in the next milestone. This build verifies the app shell and your API keys."
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
    }

    private var sessionGrid: some View {
        ScrollView {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 220), spacing: 16)], spacing: 16) {
                ForEach(sessions) { session in
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
            }
            .padding(20)
        }
    }
}
