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

        // Anchor the popover to a transparent, click-through subview placed
        // exactly at the word's rect, and present relative to that view's own
        // bounds. Passing a rect in a flipped or scroll-magnified view
        // repeatedly produced displaced anchors (the arrow landing ~100pt off
        // the word); a real subview's on-screen frame is plain geometry that
        // AppKit can't reinterpret. The anchor is removed when the popover
        // closes (observer installed after the verify-flip below, so the
        // intermediate close can't tear the anchor down early).
        let anchor = PopoverAnchorView(frame: rect)
        view.addSubview(anchor)

        // Prefer whichever side of the word has room on screen, like the
        // system Look Up panel: above if the panel fits above, else below if
        // it fits below, else whichever side is larger. Screen space (not
        // window space) is what matters — a popover is its own window and
        // may extend past the app window's edges.
        let anchorOnScreen: NSRect
        if let window = view.window {
            anchorOnScreen = window.convertToScreen(anchor.convert(anchor.bounds, to: nil))
        } else {
            anchorOnScreen = rect
        }
        let screenFrame = view.window?.screen?.visibleFrame
            ?? NSRect(x: 0, y: 0, width: 100_000, height: 100_000)
        let spaceAbove = screenFrame.maxY - anchorOnScreen.maxY
        let spaceBelow = anchorOnScreen.minY - screenFrame.minY
        // DictionaryView is 340pt tall + popover chrome/arrow.
        let estimatedPanelHeight: CGFloat = 380
        let wantsAbove = spaceAbove >= estimatedPanelHeight
            || (spaceBelow < estimatedPanelHeight && spaceAbove >= spaceBelow)

        // The anchor is a plain non-flipped view, so its bounds edges are
        // unambiguous: maxY = visual top, minY = visual bottom. Belt and
        // braces anyway: check which side of the word the popover's window
        // actually landed on, and re-show once with the opposite edge if it
        // landed on the wrong side.
        popover.show(relativeTo: anchor.bounds, of: anchor, preferredEdge: wantsAbove ? .maxY : .minY)
        if let popoverWindow = popover.contentViewController?.view.window {
            let landedAbove = popoverWindow.frame.midY >= anchorOnScreen.midY
            if landedAbove != wantsAbove {
                popover.close()
                popover.show(relativeTo: anchor.bounds, of: anchor, preferredEdge: wantsAbove ? .minY : .maxY)
            }
        }

        anchor.removeWhenClosed(popover)

        return popover
    }
}

/// Invisible popover anchor: occupies the looked-up word's exact rect but
/// never intercepts mouse events, so clicks over the word keep reaching the
/// reader view underneath. Removes itself from the view hierarchy when the
/// popover it anchors closes.
private final class PopoverAnchorView: NSView {
    private var closeObservation: NSObjectProtocol?

    override func hitTest(_ point: NSPoint) -> NSView? { nil }

    func removeWhenClosed(_ popover: NSPopover) {
        closeObservation = NotificationCenter.default.addObserver(
            forName: NSPopover.didCloseNotification, object: popover, queue: .main
        ) { [weak self] _ in
            self?.removeFromSuperview()
        }
    }

    deinit {
        if let closeObservation {
            NotificationCenter.default.removeObserver(closeObservation)
        }
    }
}
