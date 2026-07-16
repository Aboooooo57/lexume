import AppKit
import SwiftData
import SwiftUI

/// Builds and shows the Lexume dictionary panel (`DictionaryView` hosted in a
/// self-positioned `NSPanel`) anchored beside a word's on-screen rect — the
/// "Preview.app Look Up" moment, shared by both the reflowed-text reader
/// (`LexisTextView`) and Original Layout mode's page overlay.
///
/// Deliberately not `NSPopover`: NSPopover has a documented bug where its
/// computed position goes wrong once the positioning view has been scrolled
/// (https://github.com/nohros/nsPopover/issues/3) — exactly what Original
/// Layout mode's magnified `NSScrollView` does, and no amount of anchor-edge
/// or anchor-view tweaking around `show(relativeTo:of:preferredEdge:)` fixed
/// it reliably. This computes the panel's screen origin with plain
/// arithmetic instead, so there's no positioning black box left to go wrong.
enum DictionaryPopoverPresenter {
    private static let panelSize = CGSize(width: 380, height: 340)
    private static let gap: CGFloat = 8
    private static let screenMargin: CGFloat = 8

    @discardableResult
    static func show(
        word: String,
        at rect: NSRect,
        on view: NSView,
        sessionID: PersistentIdentifier,
        container: ModelContainer,
        onClose: (() -> Void)? = nil
    ) -> NSPanel {
        let anchorOnScreen: NSRect
        if let window = view.window {
            anchorOnScreen = window.convertToScreen(view.convert(rect, to: nil))
        } else {
            anchorOnScreen = rect
        }
        let screenFrame = view.window?.screen?.visibleFrame
            ?? NSRect(x: 0, y: 0, width: 100_000, height: 100_000)

        // Prefer whichever side of the word has room on screen, like the
        // system Look Up panel: above if it fits above, else below if it
        // fits below, else whichever side is larger.
        let spaceAbove = screenFrame.maxY - anchorOnScreen.maxY
        let spaceBelow = anchorOnScreen.minY - screenFrame.minY
        let wantsAbove = spaceAbove >= panelSize.height
            || (spaceBelow < panelSize.height && spaceAbove >= spaceBelow)

        var origin = CGPoint(
            x: anchorOnScreen.midX - panelSize.width / 2,
            y: wantsAbove ? anchorOnScreen.maxY + gap : anchorOnScreen.minY - gap - panelSize.height
        )
        // NSPopover kept itself fully on screen automatically; a
        // self-positioned panel needs that done explicitly.
        origin.x = min(max(origin.x, screenFrame.minX + screenMargin), screenFrame.maxX - panelSize.width - screenMargin)
        origin.y = min(max(origin.y, screenFrame.minY + screenMargin), screenFrame.maxY - panelSize.height - screenMargin)

        let panel = DictionaryPanel(
            contentRect: CGRect(origin: origin, size: panelSize),
            styleMask: [.nonactivatingPanel, .borderless],
            backing: .buffered,
            defer: false
        )
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = true
        panel.level = .floating
        panel.isReleasedWhenClosed = false
        panel.collectionBehavior = [.moveToActiveSpace, .fullScreenAuxiliary]
        panel.onDidClose = onClose

        // contentView, deliberately NOT contentViewController: handing the
        // window a view controller hands AppKit control of the window's
        // size, and SwiftUI hosting resizes the window to the content's
        // ideal size by default — which re-anchored (i.e. moved) this panel
        // whenever the view transitioned between its loading and loaded
        // states. A plain NSHostingView with empty sizingOptions leaves the
        // frame entirely app-managed.
        let hostingView = NSHostingView(
            rootView: DictionaryView(
                initialWord: word,
                sessionID: sessionID,
                container: container,
                onClose: { [weak panel] in panel?.close() }
            )
        )
        hostingView.sizingOptions = []
        hostingView.frame = NSRect(origin: .zero, size: panelSize)
        hostingView.autoresizingMask = [.width, .height]
        panel.contentView = hostingView

        // Assert the frame last, after all content setup — the final word
        // on position and size stays ours no matter what happened above.
        // Entrance echoes NSPopover: start slightly nearer the word, then
        // fade in while sliding the last few points into place.
        let finalFrame = NSRect(origin: origin, size: panelSize)
        var startFrame = finalFrame
        startFrame.origin.y += wantsAbove ? -6 : 6
        panel.setFrame(startFrame, display: false)
        panel.alphaValue = 0
        panel.makeKeyAndOrderFront(nil)
        // The system window shadow is the card's only shadow (a SwiftUI
        // .shadow can't draw outside the window). Recompute it now that the
        // rounded content has drawn, so it hugs the rounded shape.
        panel.invalidateShadow()
        NSAnimationContext.runAnimationGroup { context in
            context.duration = 0.18
            context.timingFunction = CAMediaTimingFunction(name: .easeOut)
            panel.animator().alphaValue = 1
            panel.animator().setFrame(finalFrame, display: true)
        }
        panel.activateClickAwayMonitor()

        return panel
    }
}

/// Self-positioned floating panel for the dictionary lookup. Closes on
/// Escape and on a click anywhere else in the app (a *local* event monitor,
/// so clicking another app leaves it open — same spirit as NSPopover's old
/// `.semitransient` behavior); `onDidClose` fires exactly once regardless of
/// which of those paths triggered the close.
final class DictionaryPanel: NSPanel {
    private var localMonitor: Any?
    private var isClosing = false
    fileprivate var onDidClose: (() -> Void)?

    override var canBecomeKey: Bool { true }

    fileprivate func activateClickAwayMonitor() {
        localMonitor = NSEvent.addLocalMonitorForEvents(matching: [.leftMouseDown, .rightMouseDown]) { [weak self] event in
            guard let self, event.window !== self else { return event }
            self.close()
            return event
        }
    }

    override func cancelOperation(_ sender: Any?) {
        close()
    }

    /// Fade out briefly, then really close. `onDidClose` fires immediately
    /// (not after the fade) so a caller that opens a replacement panel in
    /// the same beat can't have its fresh lookup highlight stripped a beat
    /// later by this panel's deferred cleanup.
    override func close() {
        guard !isClosing else { return }
        isClosing = true
        if let localMonitor {
            NSEvent.removeMonitor(localMonitor)
            self.localMonitor = nil
        }
        ignoresMouseEvents = true
        let callback = onDidClose
        onDidClose = nil
        callback?()
        NSAnimationContext.runAnimationGroup({ context in
            context.duration = 0.12
            context.timingFunction = CAMediaTimingFunction(name: .easeIn)
            self.animator().alphaValue = 0
        }, completionHandler: {
            // Deliberately strong self: keeps the panel alive through the
            // fade even after the presenting view drops its reference
            // (isReleasedWhenClosed is false, so this is the last owner).
            super.close()
        })
    }
}
