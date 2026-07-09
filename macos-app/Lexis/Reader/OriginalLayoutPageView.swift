import AppKit
import SwiftData
import SwiftUI

/// Renders a page's original rasterized image (PDF page or photo) with
/// invisible clickable regions over each OCR'd word, so Original Layout mode
/// gets the same click / right-click / force-click Lexis dictionary popover
/// as the reflowed-text reader (`LexisTextView`) — just anchored to the
/// word's real position on the page instead of reflowed text.
///
/// Wrapped in an `NSScrollView` with `allowsMagnification = true` so
/// trackpad pinch zooms and two-finger scroll pans, using AppKit's own
/// battle-tested magnification machinery (the same mechanism Preview/Xcode
/// use) rather than hand-rolled zoom/pan math — `OriginalLayoutNSView`'s own
/// hit-testing stays in its native, unmagnified coordinate space throughout,
/// since `convert(_:from:)` already accounts for whatever
/// scroll/magnification the enclosing scroll view is currently applying.
struct OriginalLayoutPageView: NSViewRepresentable {
    var image: CGImage
    var wordBoxes: [WordBox]
    var sessionID: PersistentIdentifier
    var container: ModelContainer

    /// Base (1x magnification) width the document view is sized to; the
    /// user pinch-zooms in/out from there. Fixed rather than derived from
    /// the scroll view's current bounds, which aren't reliably resolved yet
    /// on the first layout pass.
    private static let baseWidth: CGFloat = 1000

    func makeNSView(context: Context) -> NSScrollView {
        let documentView = OriginalLayoutNSView()
        documentView.wantsLayer = true
        apply(to: documentView)
        documentView.frame = Self.baseFrame(for: image)

        let scrollView = NSScrollView()
        // A plain NSClipView pins the document to its top-left corner
        // whenever it's smaller than the visible area (e.g. zoomed out, or a
        // narrow page in a wide window) — CenteringClipView keeps it centered.
        scrollView.contentView = CenteringClipView()
        scrollView.documentView = documentView
        scrollView.hasVerticalScroller = true
        scrollView.hasHorizontalScroller = true
        scrollView.allowsMagnification = true
        scrollView.minMagnification = 0.25
        scrollView.maxMagnification = 4
        scrollView.drawsBackground = false
        return scrollView
    }

    func updateNSView(_ scrollView: NSScrollView, context: Context) {
        guard let documentView = scrollView.documentView as? OriginalLayoutNSView else { return }
        let imageChanged = documentView.image !== image
        apply(to: documentView)
        if imageChanged {
            // A new page's image — reset to the base size/zoom rather than
            // keeping whatever zoom/scroll position the previous page had.
            documentView.frame = Self.baseFrame(for: image)
            scrollView.magnification = 1
        }
    }

    private func apply(to view: OriginalLayoutNSView) {
        view.sessionID = sessionID
        view.container = container
        if view.image !== image {
            view.image = image
        }
        view.wordBoxes = wordBoxes
    }

    private static func baseFrame(for image: CGImage) -> CGRect {
        let aspect = CGFloat(image.height) / CGFloat(image.width)
        return CGRect(x: 0, y: 0, width: baseWidth, height: baseWidth * aspect)
    }
}

/// Standard AppKit recipe for keeping a document view centered in its
/// scroll view whenever it's smaller than the visible area, instead of
/// pinned to the top-left corner (NSClipView's default).
final class CenteringClipView: NSClipView {
    override func constrainBoundsRect(_ proposedBounds: NSRect) -> NSRect {
        var rect = super.constrainBoundsRect(proposedBounds)
        guard let documentView else { return rect }
        let documentFrame = documentView.frame
        if rect.width > documentFrame.width {
            rect.origin.x = (documentFrame.width - rect.width) / 2
        }
        if rect.height > documentFrame.height {
            rect.origin.y = (documentFrame.height - rect.height) / 2
        }
        return rect
    }
}

/// Deliberately not flipped (AppKit's default, bottom-left origin) — this
/// matches Vision's normalized bounding-box convention exactly, so word
/// boxes need no extra Y-flip to line up with the drawn image.
final class OriginalLayoutNSView: NSView {
    var sessionID: PersistentIdentifier?
    var container: ModelContainer?

    var image: CGImage? {
        didSet { needsDisplay = true }
    }
    var wordBoxes: [WordBox] = []

    private var activePopover: NSPopover?
    private let lookupLayer = CALayer()

    /// Marquee-style text selection: a drag selects every word box it
    /// touches (there's no real line/paragraph structure to select a
    /// continuous range within, since this is OCR word boxes over an image,
    /// not real text layout).
    private var selectionAnchor: NSPoint?
    private var selectedWordIndices: Set<Int> = []

    override var acceptsFirstResponder: Bool { true }
    override var isFlipped: Bool { false }

    override func draw(_ dirtyRect: NSRect) {
        super.draw(dirtyRect)
        guard let image, let context = NSGraphicsContext.current?.cgContext else { return }
        let frame = imageFrame()
        context.draw(image, in: frame)

        guard !selectedWordIndices.isEmpty else { return }
        NSColor.selectedTextBackgroundColor.withAlphaComponent(0.4).setFill()
        for index in selectedWordIndices where wordBoxes.indices.contains(index) {
            NSBezierPath(rect: viewRect(for: wordBoxes[index], in: frame)).fill()
        }
    }

    override func setFrameSize(_ newSize: NSSize) {
        super.setFrameSize(newSize)
        needsDisplay = true
        // Held a rect computed for the old size — drop it rather than leave
        // it floating over the wrong word.
        lookupLayer.removeFromSuperlayer()
    }

    // MARK: - Text selection (drag to select, ⌘C to copy)

    override func mouseDown(with event: NSEvent) {
        window?.makeFirstResponder(self)
        selectionAnchor = convert(event.locationInWindow, from: nil)
        if !selectedWordIndices.isEmpty {
            selectedWordIndices = []
            needsDisplay = true
        }
    }

    override func mouseDragged(with event: NSEvent) {
        guard let anchor = selectionAnchor else { return }
        let current = convert(event.locationInWindow, from: nil)
        let dragRect = NSRect(
            x: min(anchor.x, current.x), y: min(anchor.y, current.y),
            width: abs(current.x - anchor.x), height: abs(current.y - anchor.y)
        )
        // A plain click (no real drag) should keep selecting nothing.
        guard dragRect.width > 3 || dragRect.height > 3 else { return }

        let frame = imageFrame()
        var newSelection: Set<Int> = []
        for (index, box) in wordBoxes.enumerated() where viewRect(for: box, in: frame).intersects(dragRect) {
            newSelection.insert(index)
        }
        guard newSelection != selectedWordIndices else { return }
        selectedWordIndices = newSelection
        needsDisplay = true
    }

    override func mouseUp(with event: NSEvent) {
        selectionAnchor = nil
    }

    @objc func copy(_ sender: Any?) {
        let text = selectedText()
        guard !text.isEmpty else { return }
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)
    }

    override func validateMenuItem(_ menuItem: NSMenuItem) -> Bool {
        if menuItem.action == #selector(copy(_:)) {
            return !selectedWordIndices.isEmpty
        }
        return super.validateMenuItem(menuItem)
    }

    /// Selected words joined in approximate reading order: grouped into rows
    /// by vertical overlap, rows top-to-bottom, words left-to-right within a
    /// row. Vision's OCR doesn't preserve real line/paragraph structure, so
    /// this approximates reading order rather than reproducing exact text
    /// flow — the same limitation any word-box-based (not real text-layer)
    /// selection has.
    private func selectedText() -> String {
        let selected = selectedWordIndices.compactMap { wordBoxes.indices.contains($0) ? wordBoxes[$0] : nil }
        guard !selected.isEmpty else { return "" }

        let byRow = selected.sorted { $0.boundingBox.midY > $1.boundingBox.midY }
        var rows: [[WordBox]] = []
        for box in byRow {
            if let lastIndex = rows.indices.last, let rowAnchor = rows[lastIndex].first,
               Self.overlapsVertically(box, rowAnchor) {
                rows[lastIndex].append(box)
            } else {
                rows.append([box])
            }
        }
        return rows
            .map { row in row.sorted { $0.boundingBox.minX < $1.boundingBox.minX }.map(\.word).joined(separator: " ") }
            .joined(separator: "\n")
    }

    private static func overlapsVertically(_ a: WordBox, _ b: WordBox) -> Bool {
        let overlap = min(a.boundingBox.maxY, b.boundingBox.maxY) - max(a.boundingBox.minY, b.boundingBox.minY)
        let minHeight = min(a.boundingBox.height, b.boundingBox.height)
        guard minHeight > 0 else { return false }
        return overlap / minHeight > 0.5
    }

    // MARK: - Force click / three-finger tap

    override func quickLook(with event: NSEvent) {
        let point = convert(event.locationInWindow, from: nil)
        guard let (box, rect) = wordBox(at: point) else {
            super.quickLook(with: event)
            return
        }
        presentPopover(word: box.word, at: rect)
        // No call to super: this suppresses the system "Look Up" panel in favor of ours.
    }

    // MARK: - Right-click menu

    override func menu(for event: NSEvent) -> NSMenu? {
        let point = convert(event.locationInWindow, from: nil)
        guard let (box, rect) = wordBox(at: point) else { return super.menu(for: event) }

        let menu = NSMenu()
        let defineItem = NSMenuItem(
            title: "Define \u{201C}\(box.word)\u{201D}",
            action: #selector(handleDefineMenuItem(_:)),
            keyEquivalent: ""
        )
        defineItem.target = self
        defineItem.representedObject = WordLocation(word: box.word, rect: rect)
        menu.addItem(defineItem)
        return menu
    }

    private struct WordLocation {
        let word: String
        let rect: NSRect
    }

    @objc private func handleDefineMenuItem(_ sender: NSMenuItem) {
        guard let location = sender.representedObject as? WordLocation else { return }
        presentPopover(word: location.word, at: location.rect)
    }

    // Plain click/drag is text selection only (above) — same lookup gesture
    // set as the reflowed reader: force click / three-finger tap (quickLook
    // above) or the right-click menu, never a plain click.

    // MARK: - Word geometry

    /// Aspect-fit rect of the image within `bounds` — a safety net for any
    /// minor mismatch, since the SwiftUI caller is expected to already
    /// constrain this view to the image's own aspect ratio.
    private func imageFrame() -> CGRect {
        guard let image else { return bounds }
        let imageSize = CGSize(width: image.width, height: image.height)
        guard imageSize.width > 0, imageSize.height > 0, bounds.width > 0, bounds.height > 0 else { return bounds }
        let imageAspect = imageSize.width / imageSize.height
        let boundsAspect = bounds.width / bounds.height
        if imageAspect > boundsAspect {
            let height = bounds.width / imageAspect
            return CGRect(x: bounds.minX, y: bounds.minY + (bounds.height - height) / 2, width: bounds.width, height: height)
        } else {
            let width = bounds.height * imageAspect
            return CGRect(x: bounds.minX + (bounds.width - width) / 2, y: bounds.minY, width: width, height: bounds.height)
        }
    }

    private func viewRect(for box: WordBox, in frame: CGRect) -> CGRect {
        CGRect(
            x: frame.minX + box.boundingBox.minX * frame.width,
            y: frame.minY + box.boundingBox.minY * frame.height,
            width: box.boundingBox.width * frame.width,
            height: box.boundingBox.height * frame.height
        )
    }

    private func wordBox(at point: NSPoint) -> (WordBox, CGRect)? {
        let frame = imageFrame()
        guard frame.width > 0, frame.height > 0, frame.contains(point) else { return nil }
        let normalized = CGPoint(x: (point.x - frame.minX) / frame.width, y: (point.y - frame.minY) / frame.height)
        guard let match = wordBoxes.first(where: { $0.boundingBox.contains(normalized) }) else { return nil }
        return (match, viewRect(for: match, in: frame))
    }

    // MARK: - Popover presentation

    private func presentPopover(word: String, at rect: NSRect) {
        guard let container, let sessionID else { return }
        activePopover?.performClose(nil)
        showLookupHighlight(at: rect)
        // rect is in this view's own coordinates — the same coordinates the
        // lookup highlight and selection rects use, which land exactly on
        // the word. The presenter anchors the popover to an invisible
        // subview at this rect, so scroll/magnification resolve through
        // ordinary view geometry.
        let popover = DictionaryPopoverPresenter.show(
            word: word, at: rect, on: self, sessionID: sessionID, container: container
        )
        popover.delegate = self
        activePopover = popover
    }

    /// System Look Up parity: keep a yellow "find indicator" highlight on
    /// the looked-up word for as long as the popover is open, so the source
    /// word stays identifiable next to the panel. Semi-transparent because
    /// this layer composites *over* the rendered page (unlike a text
    /// background, which draws behind glyphs) — the word must show through.
    private func showLookupHighlight(at rect: NSRect) {
        if lookupLayer.superlayer == nil {
            wantsLayer = true
            lookupLayer.backgroundColor = NSColor.findHighlightColor.withAlphaComponent(0.5).cgColor
            lookupLayer.cornerRadius = 3
            layer?.addSublayer(lookupLayer)
        }
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        lookupLayer.frame = rect.insetBy(dx: -3, dy: -2)
        CATransaction.commit()
    }
}

extension OriginalLayoutNSView: NSPopoverDelegate {
    func popoverDidClose(_ notification: Notification) {
        // presentPopover closes the previous popover while installing a new
        // one; only clean up if the closing popover is still the current one,
        // so a late close notification can't strip the new lookup's highlight.
        guard (notification.object as? NSPopover) === activePopover else { return }
        lookupLayer.removeFromSuperlayer()
        activePopover = nil
    }
}
