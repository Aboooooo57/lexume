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
        // Instant appearance — also makes the verify-and-flip below (when it
        // has to re-show on the other side) imperceptible.
        popover.animates = false

        // Prefer whichever side of the word has room on screen, like the
        // system Look Up panel: above if the panel fits above, else below if
        // it fits below, else whichever side is larger. Screen space (not
        // window space) is what matters — a popover is its own window and
        // may extend past the app window's edges.
        let hostWindow = view.window
        let wordOnScreen = hostWindow.map { $0.convertToScreen(view.convert(rect, to: nil)) } ?? rect
        let screenFrame = hostWindow?.screen?.visibleFrame
            ?? NSRect(x: 0, y: 0, width: 100_000, height: 100_000)
        let spaceAbove = screenFrame.maxY - wordOnScreen.maxY
        let spaceBelow = wordOnScreen.minY - screenFrame.minY
        let estimatedPanelHeight: CGFloat = 500
        let wantsAbove = spaceAbove >= estimatedPanelHeight
            || (spaceBelow < estimatedPanelHeight && spaceAbove >= spaceBelow)

        // The NSPopover.h header says preferredEdge respects the positioning
        // view's isFlipped state; observed behavior hasn't reliably matched
        // that. So: first attempt uses the documented flip-aware mapping,
        // then we check which side of the word the popover's window actually
        // landed on and re-show once with the opposite edge if it landed on
        // the wrong side. Deterministic under either interpretation.
        let edgeForAbove: NSRectEdge = view.isFlipped ? .minY : .maxY
        let edgeForBelow: NSRectEdge = view.isFlipped ? .maxY : .minY
        popover.show(relativeTo: rect, of: view, preferredEdge: wantsAbove ? edgeForAbove : edgeForBelow)

        if let popoverWindow = popover.contentViewController?.view.window {
            let landedAbove = popoverWindow.frame.midY >= wordOnScreen.midY
            if landedAbove != wantsAbove {
                popover.close()
                popover.show(relativeTo: rect, of: view, preferredEdge: wantsAbove ? edgeForBelow : edgeForAbove)
            }
        }
        return popover
    }
}
