#if canImport(UIKit)
import SwiftData
import SwiftUI
import UIKit

/// Renders a page's original rasterized image (PDF page or photo) with
/// tappable OCR word regions, so Original Layout mode on iPad gets the same
/// Lexume dictionary popover as the reflowed-text reader — anchored to the
/// word's real position on the page.
///
/// The iPad counterpart of `OriginalLayoutPageView.swift` (macOS/AppKit),
/// deliberately built the same way `ParagraphTextView+iOS.swift` is: a
/// SwiftUI `View` that owns the popover state and wraps a private
/// `UIViewRepresentable`, rather than a representable that presents its own
/// panel. macOS drives an `NSPanel` through `DictionaryPopoverPresenter`
/// because AppKit has no equivalent to SwiftUI's `.popover` anchoring; on
/// iPad the native popover is the better tool, and it is what the reflowed
/// reader already uses.
///
/// Zoom and pan come from `UIScrollView`, mirroring the macOS file's own
/// reasoning for `NSScrollView.allowsMagnification` — use the platform's
/// battle-tested magnification machinery rather than hand-rolled zoom/pan
/// math. It also makes hit-testing free: a tap recognizer on the image view
/// reports points already in that view's own unzoomed coordinate space,
/// whatever zoom/scroll is currently applied. (The Compose implementation on
/// Android had to invert its own transform by hand only because Compose has
/// no `UIScrollView` equivalent — the interaction design is ported from
/// there, the coordinate math is not.)
///
/// Scope, matching the Android build: pinch-zoom, pan, tap-to-define,
/// double-tap-to-fit, and a highlight on the word being defined. No
/// drag-to-select-and-copy — that needs the macOS view's row-grouped
/// reading-order reconstruction, a second gesture surface over the same
/// view, and is deliberately left out of the first iPad version.
struct OriginalLayoutPageView: View {
    var image: CGImage
    var wordBoxes: [WordBox]
    var sessionID: PersistentIdentifier
    var container: ModelContainer

    @State private var lookup: WordLookup?

    var body: some View {
        Representable(
            image: image,
            wordBoxes: wordBoxes,
            highlighted: lookup?.box,
            onTapWord: { word, box, anchor in
                lookup = WordLookup(word: word, box: box, anchor: anchor)
            }
        )
        // A zero-content overlay pinned to the tapped word's on-screen rect,
        // purely so the popover has something to point at. Anchoring to the
        // representable itself (what the reflowed reader settles for) would
        // put the popover in the middle of a full page view, potentially far
        // from the word being defined.
        // Kept in the hierarchy unconditionally (just zero-sized and
        // invisible when idle) rather than inserted alongside the lookup:
        // a popover attached to a view that appears in the same render pass
        // as the item it presents on is fragile, whereas an anchor that
        // already exists only has to move.
        .overlay(alignment: .topLeading) {
            let anchor = lookup?.anchor ?? .zero
            Color.clear
                .frame(width: max(anchor.width, 1), height: max(anchor.height, 1))
                .offset(x: anchor.minX, y: anchor.minY)
                .popover(item: $lookup) { active in
                    DictionaryView(
                        initialWord: active.word,
                        sessionID: sessionID,
                        container: container,
                        onClose: { lookup = nil }
                    )
                    .frame(width: 380, height: 340)
                }
        }
    }

    /// The word currently being defined: its text, its box (for the on-page
    /// highlight) and its on-screen rect at tap time (for popover anchoring).
    private struct WordLookup: Identifiable {
        let id = UUID()
        let word: String
        let box: WordBox
        let anchor: CGRect
    }

    private struct Representable: UIViewRepresentable {
        let image: CGImage
        let wordBoxes: [WordBox]
        let highlighted: WordBox?
        let onTapWord: (String, WordBox, CGRect) -> Void

        func makeUIView(context: Context) -> PageScrollView {
            let view = PageScrollView()
            view.delegate = context.coordinator
            context.coordinator.view = view

            let tap = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handleTap(_:)))
            let doubleTap = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handleDoubleTap(_:)))
            doubleTap.numberOfTapsRequired = 2
            // Without this a single tap fires immediately on the first tap of
            // a double-tap, opening a definition the user never asked for.
            tap.require(toFail: doubleTap)
            view.imageView.addGestureRecognizer(tap)
            view.imageView.addGestureRecognizer(doubleTap)
            view.imageView.isUserInteractionEnabled = true

            view.cgImage = image
            view.wordBoxes = wordBoxes
            view.highlighted = highlighted
            return view
        }

        func updateUIView(_ view: PageScrollView, context: Context) {
            context.coordinator.onTapWord = onTapWord
            context.coordinator.view = view
            // A new page — PageScrollView resets zoom and scroll position
            // itself rather than inheriting the previous page's framing,
            // matching what updateNSView does on macOS.
            if view.cgImage !== image {
                view.cgImage = image
            }
            view.wordBoxes = wordBoxes
            view.highlighted = highlighted
        }

        func makeCoordinator() -> Coordinator {
            Coordinator(onTapWord: onTapWord)
        }

        final class Coordinator: NSObject, UIScrollViewDelegate {
            var onTapWord: (String, WordBox, CGRect) -> Void
            weak var view: PageScrollView?

            init(onTapWord: @escaping (String, WordBox, CGRect) -> Void) {
                self.onTapWord = onTapWord
            }

            func viewForZooming(in scrollView: UIScrollView) -> UIView? {
                (scrollView as? PageScrollView)?.imageView
            }

            func scrollViewDidZoom(_ scrollView: UIScrollView) {
                (scrollView as? PageScrollView)?.centerContent()
            }

            @objc func handleTap(_ recognizer: UITapGestureRecognizer) {
                guard let view, let imageView = recognizer.view else { return }
                let point = recognizer.location(in: imageView)
                guard let box = view.wordBox(at: point) else { return }
                onTapWord(box.word, box, view.visibleRect(for: box))
            }

            @objc func handleDoubleTap(_ recognizer: UITapGestureRecognizer) {
                guard let view else { return }
                view.setZoomScale(view.minimumZoomScale, animated: true)
            }
        }
    }
}

/// A scroll view that sizes its image view to fit, keeps it centered while
/// smaller than the viewport, and owns the word-box geometry.
///
/// Sizing the image view to the *exact* aspect-fit rect (rather than filling
/// the scroll view and letterboxing inside it, which is what the macOS view
/// does via `imageFrame()`) means `imageView.bounds` **is** the page area —
/// so word-box math needs no letterbox offset, only the coordinate-system
/// flip described on `imageRect(for:)`.
final class PageScrollView: UIScrollView {
    let imageView = UIImageView()

    private let highlightView = UIView()
    private var layoutSize: CGSize = .zero

    var cgImage: CGImage? {
        didSet {
            guard cgImage !== oldValue else { return }
            imageView.image = cgImage.map { UIImage(cgImage: $0) }
            // Force a fresh fit on the next layout pass; also drops any zoom
            // or scroll offset carried over from the previous page.
            layoutSize = .zero
            setNeedsLayout()
        }
    }

    var wordBoxes: [WordBox] = []

    var highlighted: WordBox? {
        didSet { updateHighlight() }
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        minimumZoomScale = 1
        maximumZoomScale = 6
        showsVerticalScrollIndicator = false
        showsHorizontalScrollIndicator = false
        backgroundColor = .clear
        // The page is laid out manually in layoutSubviews; letting the system
        // also apply safe-area insets would fight that and mis-center it.
        contentInsetAdjustmentBehavior = .never

        imageView.contentMode = .scaleAspectFit
        addSubview(imageView)

        highlightView.backgroundColor = UIColor.systemYellow.withAlphaComponent(0.35)
        highlightView.layer.borderColor = UIColor.systemYellow.cgColor
        highlightView.layer.borderWidth = 1
        highlightView.layer.cornerRadius = 3
        highlightView.isHidden = true
        highlightView.isUserInteractionEnabled = false
        // A subview of the image view, so it zooms and pans glued to its
        // word — the same reason macOS parents its lookup layer to the
        // document view rather than the scroll view.
        imageView.addSubview(highlightView)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func layoutSubviews() {
        super.layoutSubviews()
        if bounds.size != layoutSize, bounds.width > 0, bounds.height > 0 {
            layoutSize = bounds.size
            resetLayout()
        }
        centerContent()
    }

    /// Sizes the image view to the largest rect of the image's aspect ratio
    /// that fits the viewport, and returns to 1× (fit).
    private func resetLayout() {
        guard let cgImage, cgImage.width > 0, cgImage.height > 0 else { return }
        zoomScale = 1
        let imageAspect = CGFloat(cgImage.width) / CGFloat(cgImage.height)
        let boundsAspect = bounds.width / bounds.height
        let size: CGSize = imageAspect > boundsAspect
            ? CGSize(width: bounds.width, height: bounds.width / imageAspect)
            : CGSize(width: bounds.height * imageAspect, height: bounds.height)
        imageView.frame = CGRect(origin: .zero, size: size)
        contentSize = size
        centerContent()
        // With a centering contentInset applied, the resting offset is
        // -inset, not .zero — .zero would pin a fitted page to the top-left
        // corner instead of centering it.
        contentOffset = CGPoint(x: -contentInset.left, y: -contentInset.top)
        updateHighlight()
    }

    /// Keeps the page centered whenever it's smaller than the viewport —
    /// the UIKit counterpart of macOS's `CenteringClipView`.
    func centerContent() {
        let insetX = max(0, (bounds.width - contentSize.width) / 2)
        let insetY = max(0, (bounds.height - contentSize.height) / 2)
        contentInset = UIEdgeInsets(top: insetY, left: insetX, bottom: insetY, right: insetX)
    }

    /// A word box's rect in `imageView`'s coordinate space.
    ///
    /// `WordBox.boundingBox` is normalized in Vision's **bottom-left origin**
    /// convention, which the macOS view can use unchanged because an
    /// unflipped `NSView` shares it. UIKit's origin is top-left with y
    /// increasing downward, so the box's distance-from-bottom (`maxY`)
    /// becomes its distance-from-top here. Getting this backwards puts every
    /// highlight on the wrong line of the page — vertically mirrored, and
    /// most visibly wrong near the top and bottom margins.
    func imageRect(for box: WordBox) -> CGRect {
        let bounds = imageView.bounds
        return CGRect(
            x: box.boundingBox.minX * bounds.width,
            y: (1 - box.boundingBox.maxY) * bounds.height,
            width: box.boundingBox.width * bounds.width,
            height: box.boundingBox.height * bounds.height
        )
    }

    /// A word box's rect relative to this scroll view's **visible** frame —
    /// what SwiftUI lays its overlay out in, and therefore what the
    /// dictionary popover must anchor to.
    ///
    /// `convert(_:from:)` alone is not enough: a scroll view's own
    /// coordinate space is its *content* space (`bounds.origin` tracks
    /// `contentOffset`), so the result has to be shifted back by the current
    /// offset. This matters even before the user scrolls anything — the
    /// centering `contentInset` leaves the resting offset at `-inset`, so
    /// skipping this step would misplace the popover on every page that
    /// doesn't exactly fill the viewport.
    func visibleRect(for box: WordBox) -> CGRect {
        convert(imageRect(for: box), from: imageView)
            .offsetBy(dx: -contentOffset.x, dy: -contentOffset.y)
    }

    /// The word under `point` (in `imageView`'s coordinate space): an exact
    /// hit first, else the nearest box within [tapTolerance]. macOS requires
    /// an exact hit because a mouse is precise; a fingertip is not, so a
    /// near miss snaps to the closest word rather than doing nothing —
    /// same forgiving behavior as the Android build.
    func wordBox(at point: CGPoint) -> WordBox? {
        let bounds = imageView.bounds
        guard bounds.width > 0, bounds.height > 0, !wordBoxes.isEmpty else { return nil }

        let normalized = CGPoint(x: point.x / bounds.width, y: 1 - point.y / bounds.height)
        if let hit = wordBoxes.first(where: { $0.boundingBox.contains(normalized) }) {
            return hit
        }

        var best: WordBox?
        var bestDistance = CGFloat.greatestFiniteMagnitude
        for box in wordBoxes {
            let rect = box.boundingBox
            let dx = max(rect.minX - normalized.x, 0, normalized.x - rect.maxX)
            let dy = max(rect.minY - normalized.y, 0, normalized.y - rect.maxY)
            let distance = dx * dx + dy * dy
            if distance < bestDistance {
                bestDistance = distance
                best = box
            }
        }
        return bestDistance <= Self.tapTolerance * Self.tapTolerance ? best : nil
    }

    private func updateHighlight() {
        guard let highlighted, imageView.bounds.width > 0 else {
            highlightView.isHidden = true
            return
        }
        highlightView.isHidden = false
        highlightView.frame = imageRect(for: highlighted).insetBy(dx: -3, dy: -2)
    }

    /// Snap radius for a near-miss tap, in normalized page units — about 2%
    /// of the page's shorter side.
    private static let tapTolerance: CGFloat = 0.02
}
#endif
