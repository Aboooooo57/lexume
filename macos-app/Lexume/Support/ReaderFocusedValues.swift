import SwiftUI

/// Actions the frontmost reader window exposes to the app's menu bar.
/// Published as a focused scene value so Space/⌘←/⌘→ work whenever a
/// reader window is key, without the App scene needing to reach into
/// per-window view model state directly.
struct ReaderControls {
    var canTogglePlayback: Bool
    var isPlaying: Bool
    var togglePlayback: () -> Void
    var canGoToPreviousPage: Bool
    var canGoToNextPage: Bool
    var previousPage: () -> Void
    var nextPage: () -> Void
}

private struct ReaderControlsKey: FocusedValueKey {
    typealias Value = ReaderControls
}

extension FocusedValues {
    var readerControls: ReaderControls? {
        get { self[ReaderControlsKey.self] }
        set { self[ReaderControlsKey.self] = newValue }
    }
}
