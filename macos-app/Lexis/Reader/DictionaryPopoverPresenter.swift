import AppKit
import SwiftData
import SwiftUI

/// Builds and shows the Lexis dictionary popover (`DictionaryView` hosted in
/// an `NSPopover`) anchored to a rect on a presenting `NSView` — the
/// "Preview.app Look Up" moment, shared by both the reflowed-text reader
/// (`LexisTextView`) and Original Layout mode's page overlay.
enum DictionaryPopoverPresenter {
    @discardableResult
    static func show(
        word: String,
        at rect: NSRect,
        on view: NSView,
        sessionID: PersistentIdentifier,
        container: ModelContainer
    ) -> NSPopover {
        let popover = NSPopover()
        let hosting = NSHostingController(
            rootView: DictionaryView(
                initialWord: word,
                sessionID: sessionID,
                container: container,
                onClose: { [weak popover] in popover?.performClose(nil) }
            )
        )
        popover.contentViewController = hosting
        // .semitransient (not .transient): closes on a click elsewhere in this
        // window, but stays open when the app is deactivated or minimized.
        popover.behavior = .semitransient
        popover.show(relativeTo: rect, of: view, preferredEdge: .maxY)
        return popover
    }
}
