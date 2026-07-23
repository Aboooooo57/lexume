import SwiftUI

struct PDFPageSelectorView: View {
    let pdfData: Data
    let pageCount: Int
    @Binding var selectedIndices: Set<Int>
    var onConfirm: () -> Void
    var onCancel: () -> Void

    @State private var rangeText = ""
    @State private var isZoomPresented = false
    @State private var zoomedIndex = 0
    @State private var thumbnailCache: [Int: PlatformImage] = [:]

    private let columns = [GridItem(.adaptive(minimum: 130), spacing: 12)]
    private let thumbnailSize = CGSize(width: 130, height: 168)
    private let zoomSize = CGSize(width: 560, height: 720)

    var body: some View {
        VStack(spacing: 0) {
            header
            Divider()
            ScrollView {
                LazyVGrid(columns: columns, spacing: 12) {
                    ForEach(0..<pageCount, id: \.self) { index in
                        thumbnailCard(index)
                    }
                }
                .padding(16)
            }
            Divider()
            footer
        }
        .frame(width: 660, height: 580)
        .onAppear { syncRangeText() }
        .sheet(isPresented: $isZoomPresented) {
            zoomSheet
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Choose Pages")
                .font(.title2.weight(.semibold))
            HStack {
                TextField("e.g. 1-3,5", text: $rangeText)
                    .textFieldStyle(.roundedBorder)
                    .frame(width: 200)
                    .onSubmit { applyRangeText() }
                Button("Apply") { applyRangeText() }
                Spacer()
                Button("Select All") {
                    selectedIndices = Set(0..<pageCount)
                    syncRangeText()
                }
                Button("Clear") {
                    selectedIndices = []
                    syncRangeText()
                }
            }
            Text("\(selectedIndices.count) of \(pageCount) pages selected")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(16)
    }

    private var footer: some View {
        HStack {
            Button("Cancel", role: .cancel, action: onCancel)
            Spacer()
            Button("Start Reading", action: onConfirm)
                .keyboardShortcut(.defaultAction)
                .disabled(selectedIndices.isEmpty)
        }
        .padding(16)
    }

    @ViewBuilder
    private func thumbnailCard(_ index: Int) -> some View {
        let isSelected = selectedIndices.contains(index)
        VStack(spacing: 6) {
            ZStack(alignment: .topTrailing) {
                Group {
                    if let image = thumbnailCache[index] {
                        Image(platformImage: image)
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                    } else {
                        Rectangle()
                            .fill(.quaternary)
                            .overlay(ProgressView())
                    }
                }
                .frame(width: thumbnailSize.width, height: thumbnailSize.height)
                .clipShape(RoundedRectangle(cornerRadius: 6))
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(isSelected ? Color.accentColor : Color.clear, lineWidth: 3)
                )
                .onTapGesture { toggle(index) }
                .contextMenu {
                    Button("Zoom In") { zoomedIndex = index; isZoomPresented = true }
                }

                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(isSelected ? Color.accentColor : Color.secondary)
                    .background(Circle().fill(.background))
                    .padding(4)
                    .onTapGesture { toggle(index) }
            }
            Text("\(index + 1)")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .task(id: index) {
            await loadThumbnailIfNeeded(index, size: thumbnailSize)
        }
    }

    private var zoomSheet: some View {
        VStack(spacing: 12) {
            if let image = thumbnailCache[zoomedIndex] {
                Image(nsImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(maxWidth: zoomSize.width, maxHeight: zoomSize.height)
            } else {
                ProgressView().frame(width: zoomSize.width, height: zoomSize.height)
            }
            HStack {
                Button {
                    zoomedIndex = max(0, zoomedIndex - 1)
                } label: { Image(systemName: "chevron.left") }
                    .disabled(zoomedIndex <= 0)

                Spacer()

                Button(selectedIndices.contains(zoomedIndex) ? "Deselect" : "Select") {
                    toggle(zoomedIndex)
                }

                Spacer()

                Button {
                    zoomedIndex = min(pageCount - 1, zoomedIndex + 1)
                } label: { Image(systemName: "chevron.right") }
                    .disabled(zoomedIndex >= pageCount - 1)
            }
            Button("Close") { isZoomPresented = false }
        }
        .padding(20)
        .frame(width: 600)
        .task(id: zoomedIndex) {
            await loadThumbnailIfNeeded(zoomedIndex, size: zoomSize)
        }
    }

    private func toggle(_ index: Int) {
        if selectedIndices.contains(index) {
            selectedIndices.remove(index)
        } else {
            selectedIndices.insert(index)
        }
        syncRangeText()
    }

    private func syncRangeText() {
        rangeText = PageRangeParser.format(Array(selectedIndices))
    }

    private func applyRangeText() {
        selectedIndices = Set(PageRangeParser.parse(rangeText, pageCount: pageCount))
        syncRangeText()
    }

    private func loadThumbnailIfNeeded(_ index: Int, size: CGSize) async {
        if thumbnailCache[index] != nil { return }
        let data = pdfData
        let image = await Task.detached(priority: .userInitiated) {
            PDFPageExtractor.thumbnail(pageIndex: index, in: data, size: size)
        }.value
        if let image {
            thumbnailCache[index] = image
        }
    }
}
