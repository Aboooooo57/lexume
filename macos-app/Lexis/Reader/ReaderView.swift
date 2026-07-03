import SwiftUI
import SwiftData

struct ReaderView: View {
    let sessionID: PersistentIdentifier

    @Environment(\.modelContext) private var modelContext
    @State private var viewModel: ReaderViewModel?

    @AppStorage(AppSettings.fontFamilyKey) private var fontFamilyRaw = "sans"
    @AppStorage(AppSettings.fontSizeKey) private var fontSize = 18.0
    @AppStorage(AppSettings.readingThemeKey) private var themeRaw = "system"

    private var theme: ReadingTheme { ReadingTheme(rawValue: themeRaw) ?? .system }

    var body: some View {
        Group {
            if let viewModel {
                content(viewModel)
            } else {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .navigationTitle(viewModel?.overview?.name ?? "Reading")
        .background(theme.backgroundColor)
        .task {
            if viewModel == nil {
                let vm = ReaderViewModel(sessionID: sessionID, container: modelContext.container)
                viewModel = vm
                await vm.start()
            }
        }
    }

    @ViewBuilder
    private func content(_ vm: ReaderViewModel) -> some View {
        VStack(spacing: 0) {
            pageBody(vm)
            Divider()
            pager(vm)
        }
    }

    @ViewBuilder
    private func pageBody(_ vm: ReaderViewModel) -> some View {
        if vm.isLoadingPage {
            ProgressView("Extracting page \(vm.currentPageNumber)…")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let error = vm.loadError {
            VStack(spacing: 12) {
                Image(systemName: "exclamationmark.triangle")
                    .font(.title)
                    .foregroundStyle(.secondary)
                Text(error)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 420)
                Button("Retry") { vm.retry() }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding()
        } else if let page = vm.currentPage {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    if let title = page.title, !title.isEmpty {
                        Text(title)
                            .font(.title.weight(.semibold))
                            .foregroundStyle(theme.foregroundColor)
                    }
                    ForEach(Array(paragraphs(of: page).enumerated()), id: \.offset) { _, paragraph in
                        Text(paragraph)
                            .font(readerFont)
                            .foregroundStyle(theme.foregroundColor)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .frame(maxWidth: 760, alignment: .leading)
                .padding(32)
                .frame(maxWidth: .infinity)
            }
        } else {
            ContentUnavailableView("No content", systemImage: "doc.text")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    @ViewBuilder
    private func pager(_ vm: ReaderViewModel) -> some View {
        HStack {
            Button {
                vm.goToPage(vm.currentPageNumber - 1)
            } label: {
                Image(systemName: "chevron.left")
            }
            .disabled(vm.currentPageNumber <= 1)

            Spacer()
            Text("Page \(vm.currentPageNumber) of \(vm.overview?.totalPages ?? 1)")
                .font(.callout)
                .foregroundStyle(.secondary)
            Spacer()

            Button {
                vm.goToPage(vm.currentPageNumber + 1)
            } label: {
                Image(systemName: "chevron.right")
            }
            .disabled(vm.currentPageNumber >= (vm.overview?.totalPages ?? 1))
        }
        .padding(12)
    }

    private func paragraphs(of page: PageSnapshot) -> [String] {
        guard let text = page.extractedText else { return [] }
        return SessionPage.splitParagraphs(text)
    }

    private var readerFont: Font {
        switch fontFamilyRaw {
        case "serif": return .system(size: fontSize, design: .serif)
        case "mono": return .system(size: fontSize, design: .monospaced)
        default: return .system(size: fontSize, design: .default)
        }
    }
}
