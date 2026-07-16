import SwiftUI

enum ReadingTheme: String {
    case system, light, dark, sepia

    var backgroundColor: Color {
        switch self {
        case .system: return Color(nsColor: .textBackgroundColor)
        case .light: return .white
        case .dark: return Color(red: 0.11, green: 0.11, blue: 0.12)
        case .sepia: return Color(red: 0.96, green: 0.92, blue: 0.82)
        }
    }

    var foregroundColor: Color {
        switch self {
        case .system: return .primary
        case .light: return .black
        case .dark: return .white
        case .sepia: return Color(red: 0.30, green: 0.22, blue: 0.13)
        }
    }
}
