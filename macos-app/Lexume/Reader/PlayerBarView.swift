import SwiftUI

/// Floating playback controls: shown below the reader when audio is
/// available (or being generated), hidden entirely when audio mode is "off".
@MainActor
struct PlayerBarView: View {
    let vm: ReaderViewModel

    var body: some View {
        VStack(spacing: 8) {
            if let audioError = vm.audioError {
                Text(audioError)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .lineLimit(2)
            }

            if vm.hasAudio {
                playbackControls
            } else if vm.isGeneratingAudio {
                HStack(spacing: 8) {
                    ProgressView().controlSize(.small)
                    Text("Generating narration…")
                        .font(.callout)
                        .foregroundStyle(.secondary)
                }
            } else {
                Button {
                    vm.requestGenerateAudio()
                } label: {
                    Label("Generate Audio", systemImage: "waveform")
                }
                .controlSize(.large)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity)
        .background(.regularMaterial)
    }

    private var playbackControls: some View {
        VStack(spacing: 6) {
            progressBar
            HStack(spacing: 16) {
                Text(formattedTime(vm.playbackEngine.currentTime))
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.secondary)
                    .frame(width: 40, alignment: .leading)

                Spacer()

                Button { vm.playbackEngine.restart() } label: {
                    Image(systemName: "arrow.counterclockwise")
                }
                .buttonStyle(.plain)

                Button { vm.playbackEngine.skip(by: -15) } label: {
                    Image(systemName: "gobackward.15")
                        .font(.system(size: 16))
                }
                .buttonStyle(.plain)

                Button {
                    vm.playbackEngine.toggle()
                } label: {
                    Image(systemName: vm.playbackEngine.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                        .font(.system(size: 32))
                }
                .buttonStyle(.plain)

                Button { vm.playbackEngine.skip(by: 15) } label: {
                    Image(systemName: "goforward.15")
                        .font(.system(size: 16))
                }
                .buttonStyle(.plain)

                Spacer()

                Text(formattedTime(vm.playbackEngine.duration))
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.secondary)
                    .frame(width: 40, alignment: .trailing)
            }
        }
    }

    private var progressBar: some View {
        GeometryReader { geo in
            let progress = vm.playbackEngine.duration > 0 ? vm.playbackEngine.currentTime / vm.playbackEngine.duration : 0
            ZStack(alignment: .leading) {
                Capsule().fill(Color.secondary.opacity(0.25))
                Capsule().fill(Color.accentColor)
                    .frame(width: max(0, geo.size.width * progress))
            }
            .frame(height: 6)
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { value in seek(to: value.location.x, in: geo.size.width) }
                    .onEnded { value in seek(to: value.location.x, in: geo.size.width) }
            )
        }
        .frame(height: 16)
    }

    private func seek(to x: CGFloat, in width: CGFloat) {
        guard vm.playbackEngine.duration > 0, width > 0 else { return }
        let fraction = max(0, min(1, x / width))
        vm.playbackEngine.seek(to: fraction * vm.playbackEngine.duration)
    }

    private func formattedTime(_ seconds: Double) -> String {
        guard seconds.isFinite, seconds >= 0 else { return "0:00" }
        let total = Int(seconds)
        return String(format: "%d:%02d", total / 60, total % 60)
    }
}
