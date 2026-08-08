#if canImport(AppKit)
import AppKit

typealias PlatformImage = NSImage
typealias PlatformColor = NSColor
typealias PlatformFont = NSFont
#elseif canImport(UIKit)
import UIKit

typealias PlatformImage = UIImage
typealias PlatformColor = UIColor
typealias PlatformFont = UIFont
#endif

import SwiftUI

extension Image {
    /// A single initializer name usable from shared (non-`#if`) code, instead
    /// of every call site needing its own `#if canImport(AppKit)` branch to
    /// pick between `Image(nsImage:)` and `Image(uiImage:)`.
    init(platformImage: PlatformImage) {
        #if canImport(AppKit)
        self.init(nsImage: platformImage)
        #elseif canImport(UIKit)
        self.init(uiImage: platformImage)
        #endif
    }
}

extension PlatformImage {
    /// `NSImage` needs an explicit rasterization call; `UIImage` already
    /// wraps a `CGImage` directly. Same reasoning as `Image(platformImage:)`
    /// above - one shared accessor instead of per-call-site branching.
    var platformCGImage: CGImage? {
        #if canImport(AppKit)
        return cgImage(forProposedRect: nil, context: nil, hints: nil)
        #elseif canImport(UIKit)
        return cgImage
        #endif
    }

    /// The reverse direction: `NSImage` needs an explicit size, `UIImage`
    /// infers one from the CGImage's own pixel dimensions.
    convenience init(platformCGImage cgImage: CGImage) {
        #if canImport(AppKit)
        self.init(cgImage: cgImage, size: NSSize(width: cgImage.width, height: cgImage.height))
        #elseif canImport(UIKit)
        self.init(cgImage: cgImage)
        #endif
    }
}

extension Color {
    /// `DictionaryView`'s card background - opaque, theme-adaptive, matches
    /// the window chrome behind it on macOS and the system background on iOS.
    static var platformWindowBackground: Color {
        #if canImport(AppKit)
        Color(nsColor: .windowBackgroundColor)
        #elseif canImport(UIKit)
        Color(uiColor: .systemBackground)
        #endif
    }

    /// `DictionaryView`'s card border.
    static var platformSeparator: Color {
        #if canImport(AppKit)
        Color(nsColor: .separatorColor)
        #elseif canImport(UIKit)
        Color(uiColor: .separator)
        #endif
    }
}
