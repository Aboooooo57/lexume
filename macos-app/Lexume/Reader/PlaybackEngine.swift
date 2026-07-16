import AVFoundation
import Observation

/// Drives audio playback and the karaoke tick loop: a 50ms timer samples
/// playback position (with a 100ms lookahead, matching the web app's
/// perceived-lag compensation) and resolves the active word via TokenMap.
@MainActor
@Observable
final class PlaybackEngine: NSObject, AVAudioPlayerDelegate {
    private(set) var isPlaying = false
    private(set) var currentTime: Double = 0
    private(set) var duration: Double = 0
    private(set) var activeTokenIndex: Int?

    /// Called when the track finishes playing (drives auto-advance to the next page).
    var onFinished: (() -> Void)?
    /// Called at most every ~15s (plus on pause) with the position to persist for resume.
    var onPersistPosition: ((Double) -> Void)?

    private var player: AVAudioPlayer?
    private var tokenMap: TokenMap?
    private var timer: Timer?
    private var lastPersistDate: Date = .distantPast

    func load(audioData: Data, tokenMap: TokenMap, resumeAt: Double?) throws {
        stop()
        let newPlayer = try AVAudioPlayer(data: audioData)
        newPlayer.delegate = self
        newPlayer.prepareToPlay()
        player = newPlayer
        self.tokenMap = tokenMap
        duration = newPlayer.duration

        if let resumeAt, resumeAt > 0, resumeAt < duration - 2 {
            newPlayer.currentTime = resumeAt
            currentTime = resumeAt
        } else {
            currentTime = 0
        }
        updateActiveToken()
    }

    func play() {
        guard let player else { return }
        player.play()
        isPlaying = true
        startTimer()
    }

    func pause() {
        player?.pause()
        isPlaying = false
        stopTimer()
        persistPositionNow()
    }

    func toggle() {
        isPlaying ? pause() : play()
    }

    func restart() {
        guard let player else { return }
        player.currentTime = 0
        currentTime = 0
        updateActiveToken()
        if !isPlaying { play() }
    }

    func seek(to time: Double) {
        guard let player else { return }
        let clamped = max(0, min(time, duration))
        player.currentTime = clamped
        currentTime = clamped
        updateActiveToken()
    }

    func skip(by seconds: Double) {
        seek(to: currentTime + seconds)
    }

    /// Jumps playback to the start of a specific token — used when the user
    /// clicks a word while audio is loaded.
    func seek(toToken index: Int) {
        guard let timing = tokenMap?.timing(for: index) else { return }
        seek(to: timing.start)
    }

    func stop() {
        stopTimer()
        player?.stop()
        player = nil
        isPlaying = false
        currentTime = 0
        duration = 0
        activeTokenIndex = nil
        tokenMap = nil
    }

    private func startTimer() {
        stopTimer()
        let newTimer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { _ in
            Task { @MainActor [weak self] in self?.tick() }
        }
        RunLoop.main.add(newTimer, forMode: .common)
        timer = newTimer
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }

    private func tick() {
        guard let player else { return }
        currentTime = player.currentTime
        updateActiveToken()
        maybePersistPosition()
    }

    private func updateActiveToken() {
        guard let tokenMap else {
            activeTokenIndex = nil
            return
        }
        let lookahead = currentTime + 0.10
        activeTokenIndex = tokenMap.activeTokenIndex(at: lookahead, hint: activeTokenIndex)
    }

    private func maybePersistPosition() {
        guard Date().timeIntervalSince(lastPersistDate) >= 15 else { return }
        persistPositionNow()
    }

    private func persistPositionNow() {
        lastPersistDate = Date()
        onPersistPosition?(currentTime)
    }

    nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        Task { @MainActor in
            self.isPlaying = false
            self.stopTimer()
            self.currentTime = 0
            self.persistPositionNow()
            self.onFinished?()
        }
    }
}
