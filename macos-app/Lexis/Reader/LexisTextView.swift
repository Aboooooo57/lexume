import AppKit
import SwiftData
import SwiftUI

/// Non-editable text view that turns click / right-click / force-click
/// (three-finger tap) on any word into an anchored Lexis dictionary popover —
/// the "Preview.app Look Up" moment. Word hit-testing and popover anchoring
/// use TextKit 1 (NSLayoutManager), which is simpler and more predictable
/// than TextKit 2 for this purpose; the karaoke highlighter in a later
/// milestone can adopt TextKit 2 independently if needed.
final class LexisTextView: NSTextView {
    var sessionID: PersistentIdentifier?
    var container: ModelContainer?

    /// Set by ParagraphTextView to avoid redundant reflows on every SwiftUI update.
    var appliedFont: NSFont?
    var appliedColor: NSColor?

    private var activePopover: NSPopover?
    private var mouseDownLocation: NSPoint?

    override var acceptsFirstResponder: Bool { true }

    // MARK: - Force click / three-finger tap

    override func quickLook(with event: NSEvent) {
        guard let (word, rect) = wordInfo(at: event.locationInWindow) else {
            super.quickLook(with: event)
            return
        }
        presentPopover(word: word, at: rect)
        // No call to super: this suppresses the system "Look Up" panel in favor of ours.
    }

    // MARK: - Right-click menu

    override func menu(for event: NSEvent) -> NSMenu? {
        guard let (word, rect) = wordInfo(at: event.locationInWindow) else {
            return super.menu(for: event)
        }
        let menu = NSMenu()

        let defineItem = NSMenuItem(
            title: "Define \u{201C}\(word)\u{201D}",
            action: #selector(handleDefineMenuItem(_:)),
            keyEquivalent: ""
        )
        defineItem.target = self
        defineItem.representedObject = WordLocation(word: word, rect: rect)
        menu.addItem(defineItem)

        menu.addItem(.separator())
        menu.addItem(withTitle: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        menu.addItem(.separator())

        let systemLookupItem = NSMenuItem(
            title: "Look Up \u{201C}\(word)\u{201D} (System)",
            action: #selector(handleSystemLookup(_:)),
            keyEquivalent: ""
        )
        systemLookupItem.target = self
        systemLookupItem.representedObject = event
        menu.addItem(systemLookupItem)

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

    @objc private func handleSystemLookup(_ sender: NSMenuItem) {
        guard let event = sender.representedObject as? NSEvent else { return }
        super.quickLook(with: event)
    }

    // MARK: - Plain click (no drag) = lookup

    override func mouseDown(with event: NSEvent) {
        mouseDownLocation = event.locationInWindow
        super.mouseDown(with: event)
    }

    override func mouseUp(with event: NSEvent) {
        super.mouseUp(with: event)
        guard let down = mouseDownLocation else { return }
        mouseDownLocation = nil
        let distance = hypot(event.locationInWindow.x - down.x, event.locationInWindow.y - down.y)
        guard distance < 3, selectedRange().length == 0 else { return }
        guard let (word, rect) = wordInfo(at: event.locationInWindow) else { return }
        presentPopover(word: word, at: rect)
    }

    // MARK: - Word resolution

    private func wordInfo(at windowPoint: NSPoint) -> (String, NSRect)? {
        guard let textContainer = self.textContainer,
              let layoutManager = textContainer.layoutManager,
              let textStorage = layoutManager.textStorage,
              textStorage.length > 0
        else { return nil }

        let viewPoint = convert(windowPoint, from: nil)
        let containerPoint = NSPoint(
            x: viewPoint.x - textContainerOrigin.x,
            y: viewPoint.y - textContainerOrigin.y
        )
        let charIndex = layoutManager.characterIndex(
            for: containerPoint, in: textContainer, fractionOfDistanceBetweenInsertionPoints: nil
        )
        guard charIndex < textStorage.length else { return nil }

        let wordRange = selectionRange(forProposedRange: NSRange(location: charIndex, length: 0), granularity: .selectByWord)
        guard wordRange.length > 0 else { return nil }

        let rawWord = (textStorage.string as NSString).substring(with: wordRange)
        let cleaned = rawWord.filter(\.isLetter).lowercased()
        guard !cleaned.isEmpty else { return nil }

        let glyphRange = layoutManager.glyphRange(forCharacterRange: wordRange, actualCharacterRange: nil)
        var rect = layoutManager.boundingRect(forGlyphRange: glyphRange, in: textContainer)
        rect.origin.x += textContainerOrigin.x
        rect.origin.y += textContainerOrigin.y
        return (cleaned, rect)
    }

    // MARK: - Popover presentation

    private func presentPopover(word: String, at rect: NSRect) {
        guard let container, let sessionID else { return }
        activePopover?.performClose(nil)

        let hosting = NSHostingController(
            rootView: DictionaryView(initialWord: word, sessionID: sessionID, container: container)
        )
        let popover = NSPopover()
        popover.contentViewController = hosting
        popover.behavior = .transient
        popover.show(relativeTo: rect, of: self, preferredEdge: .maxY)
        activePopover = popover
    }
}
