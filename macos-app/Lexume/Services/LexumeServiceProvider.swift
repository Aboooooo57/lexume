#if os(macOS)
import AppKit
import SwiftData

/// Backs "Look Up in Lexume" in the system-wide Services menu (declared in
/// Info.plist's NSServices) - lets selected text in any app (Safari, Mail,
/// Notes, anywhere) be looked up in Lexume without switching to it first.
/// There's no reading session behind a lookup like this (no document
/// context exists outside the app), so it isn't logged to Vocabulary -
/// DictionaryView/DictionaryViewModel already treat a nil sessionID as
/// "just don't log this one," same mechanism, no special-casing needed here.
final class LexumeServiceProvider: NSObject {
    private let container: ModelContainer

    init(container: ModelContainer) {
        self.container = container
    }

    @objc func lookUpInLexume(_ pboard: NSPasteboard, userData: String, error: AutoreleasingUnsafeMutablePointer<NSString>) {
        guard let raw = pboard.string(forType: .string)?.trimmingCharacters(in: .whitespacesAndNewlines),
              !raw.isEmpty
        else {
            error.pointee = "No text was selected." as NSString
            return
        }
        // A defensive cap, not a "single word only" restriction - selecting
        // a whole paragraph by accident shouldn't URL-encode/send all of it.
        let selection = String(raw.prefix(100))
        let container = self.container
        Task { @MainActor in
            NSApp.activate(ignoringOtherApps: true)
            DictionaryPopoverPresenter.showNearMouse(word: selection, sessionID: nil, container: container)
        }
    }
}
#endif
