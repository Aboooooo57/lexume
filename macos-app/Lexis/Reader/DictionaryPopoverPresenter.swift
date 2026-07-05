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
        // Prefer whichever side of the word has more room in the window,
        // like the system Look Up panel does — a word near the top of the
        // window gets its popover below, a word near the bottom gets it
        // above. (NSPopover can still reposition itself if even the chosen
        // side turns out too small.) Window coordinates are never flipped,
        // so "above" is always toward larger Y there; the chosen visual side
        // then maps to a rect edge per the anchor view's own coordinate
        // orientation — in a flipped view (NSTextView) minY is the visual
        // top of the word's rect, in a non-flipped view maxY is.
        let rectInWindow = view.convert(rect, to: nil)
        let windowHeight = view.window?.frame.height ?? .greatestFiniteMagnitude
        let wantsAbove = (windowHeight - rectInWindow.maxY) >= rectInWindow.minY
        let preferredEdge: NSRectEdge = wantsAbove
            ? (view.isFlipped ? .minY : .maxY)
            : (view.isFlipped ? .maxY : .minY)
        popover.show(relativeTo: rect, of: view, preferredEdge: preferredEdge)
        return popover
    }
}
