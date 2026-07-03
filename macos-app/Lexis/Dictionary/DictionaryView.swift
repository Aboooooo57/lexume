import SwiftData
import SwiftUI

/// Content shown in the anchored NSPopover — Lexis's own "Look Up" panel.
struct DictionaryView: View {
    let initialWord: String
    let sessionID: PersistentIdentifier
    let container: ModelContainer

    @State private var viewModel: DictionaryViewModel?

    var body: some View {
        Group {
            if let viewModel {
                content(viewModel)
            } else {
                ProgressView()
                    .frame(width: 360, height: 200)
            }
        }
        .task {
            if viewModel == nil {
                let vm = DictionaryViewModel(sessionID: sessionID, container: container)
                viewModel = vm
                await vm.lookup(initialWord, resetHistory: true)
            }
        }
    }

    @ViewBuilder
    private func content(_ vm: DictionaryViewModel) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            breadcrumb(vm)
            Divider()
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    if vm.isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity, minHeight: 150)
                    } else if let error = vm.errorMessage {
                        Text(error)
                            .foregroundStyle(.secondary)
                            .padding()
                    } else if let entry = vm.entry {
                        header(entry, vm)
                        ForEach(Array((entry.meanings ?? []).prefix(6).enumerated()), id: \.offset) { _, meaning in
                            meaningSection(meaning, vm)
                        }
                    } else {
                        Text("No definition found for \u{201C}\(vm.currentWord)\u{201D}.")
                            .foregroundStyle(.secondary)
                            .padding()
                    }
                }
                .padding(14)
            }
        }
        .frame(width: 360, height: 420)
    }

    private func breadcrumb(_ vm: DictionaryViewModel) -> some View {
        HStack(spacing: 6) {
            Button { vm.goBack() } label: {
                Image(systemName: "chevron.left")
            }
            .buttonStyle(.plain)
            .disabled(vm.history.count <= 1)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 4) {
                    ForEach(Array(vm.history.enumerated()), id: \.offset) { index, word in
                        Button { vm.jump(to: index) } label: {
                            Text(word)
                                .font(.caption.weight(index == vm.history.count - 1 ? .semibold : .regular))
                                .foregroundStyle(index == vm.history.count - 1 ? Color.primary : Color.secondary)
                        }
                        .buttonStyle(.plain)
                        if index < vm.history.count - 1 {
                            Image(systemName: "chevron.right")
                                .font(.caption2)
                                .foregroundStyle(.tertiary)
                        }
                    }
                }
            }

            Spacer()

            Button { vm.reset() } label: {
                Image(systemName: "arrow.counterclockwise")
            }
            .buttonStyle(.plain)
            .disabled(vm.history.count <= 1)
        }
        .padding(10)
    }

    private func header(_ entry: DictionaryEntry, _ vm: DictionaryViewModel) -> some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.word)
                    .font(.title2.weight(.semibold))
                if let phonetic = entry.phonetic ?? entry.phonetics?.first(where: { $0.text != nil })?.text {
                    Text(phonetic)
                        .font(.callout)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            if let audioURLString = entry.phonetics?.first(where: { !($0.audio ?? "").isEmpty })?.audio,
               let url = URL(string: audioURLString) {
                Button {
                    vm.playPronunciation(url: url)
                } label: {
                    Image(systemName: "speaker.wave.2.fill")
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func meaningSection(_ meaning: DictionaryEntry.Meaning, _ vm: DictionaryViewModel) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(meaning.partOfSpeech.uppercased())
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)

            ForEach(Array(meaning.definitions.prefix(3).enumerated()), id: \.offset) { index, definition in
                VStack(alignment: .leading, spacing: 4) {
                    ClickableText(text: "\(index + 1). \(definition.definition)") { word in
                        Task { await vm.lookup(word) }
                    }
                    if let example = definition.example, !example.isEmpty {
                        ClickableText(text: example, font: .callout.italic()) { word in
                            Task { await vm.lookup(word) }
                        }
                        .foregroundStyle(.secondary)
                    }
                }
            }

            if let synonyms = meaning.synonyms, !synonyms.isEmpty {
                synonymChips(Array(synonyms.prefix(5)), vm)
            }
        }
    }

    private func synonymChips(_ synonyms: [String], _ vm: DictionaryViewModel) -> some View {
        FlowLayout(spacing: 6) {
            ForEach(synonyms, id: \.self) { synonym in
                Button {
                    Task { await vm.lookup(synonym) }
                } label: {
                    Text(synonym)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(.quaternary, in: Capsule())
                }
                .buttonStyle(.plain)
            }
        }
    }
}
