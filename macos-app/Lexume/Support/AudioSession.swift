#if canImport(UIKit)
import AVFoundation
#endif

/// Puts the process's audio session into a playback category before any
/// sound is produced.
///
/// iOS-only, and easy to overlook because nothing about it is required on
/// macOS (which has no audio session at all — hence the no-op there, so call
/// sites stay free of `#if`). Without it iOS applies the default
/// `.soloAmbient` category, under which **the ring/silent switch mutes the
/// app** and audio stops on lock — which for Lexume would silently break both
/// narration (`PlaybackEngine`) and on-device word pronunciation
/// (`DictionaryViewModel.speakWord`) on a device whose owner simply has the
/// side switch flipped, with no error shown to explain it.
///
/// `.playback` is the category for content audio the user deliberately asked
/// to hear; `.spokenAudio` mode tunes it for speech rather than music.
/// Deliberately re-applied on every playback start rather than cached behind
/// a once-flag: an interruption (a call, another app taking exclusive audio)
/// deactivates our session, and the next play has to reactivate it anyway.
/// Both calls are cheap and idempotent, and failures are ignored — a session
/// that won't activate should degrade to silence, never stop playback from
/// being attempted.
enum AudioSession {
    static func activatePlayback() {
        #if canImport(UIKit)
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playback, mode: .spokenAudio)
        try? session.setActive(true)
        #endif
    }
}
