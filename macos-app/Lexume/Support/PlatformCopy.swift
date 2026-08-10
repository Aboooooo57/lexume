/// User-facing wording that differs between the Mac and iPad builds.
///
/// Kept in one place rather than `#if`-ing individual `Text(...)` calls,
/// because these same few phrases recur across Settings, Onboarding, the
/// guided tour, and error messages — and the failure mode when one is missed
/// is quiet but real: the iPad build confidently telling the user about "your
/// Mac's Keychain", or teaching a force-click gesture that does not exist on
/// a touchscreen.
enum PlatformCopy {
    /// Where API keys are stored, phrased for the device in hand.
    static let keychainLocation: String = {
        #if os(macOS)
        "your Mac's Keychain"
        #else
        "this iPad's Keychain"
        #endif
    }()

    /// Where on-device OCR runs, phrased for the device in hand.
    static let onThisDevice: String = {
        #if os(macOS)
        "entirely on your Mac"
        #else
        "entirely on this iPad"
        #endif
    }()

    /// How to reach Settings. macOS has the standard Preferences shortcut;
    /// iPad has no menu bar, so ⌘, opens nothing there — it's the gear button
    /// in the sidebar toolbar instead (see `RootView`).
    static let settingsLocation: String = {
        #if os(macOS)
        "Settings (⌘,)"
        #else
        "Settings (the gear button)"
        #endif
    }()

    /// The gesture that opens the dictionary popover on a word.
    static let wordLookupGesture: String = {
        #if os(macOS)
        "Force-click (or three-finger tap) any word — or right-click it —"
        #else
        "Long-press any word"
        #endif
    }()

    /// What Original Layout mode supports. iPad's page viewer
    /// (`OriginalLayoutPageView+iOS`) deliberately ships without
    /// drag-to-select-and-copy, so the tour must not promise it there.
    static let originalLayoutCapabilities: String = {
        #if os(macOS)
        "with pinch-to-zoom and drag-to-select-and-copy"
        #else
        "with pinch-to-zoom and tap-to-define"
        #endif
    }()

    /// Suffix for the Focus Mode exit affordance. Esc is wired via
    /// `.onExitCommand`, which is macOS-only.
    static let focusModeExitHint: String = {
        #if os(macOS)
        "Exit Focus Mode (Esc)"
        #else
        "Exit Focus Mode"
        #endif
    }()
}
