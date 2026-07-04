import Foundation
import Network
import Observation

/// Tracks basic network reachability so the UI can show an offline banner.
/// Cached sessions remain fully readable offline; only network-dependent
/// actions (extraction, TTS, dictionary, translation) are affected.
@MainActor
@Observable
final class NetworkMonitor {
    static let shared = NetworkMonitor()

    private(set) var isOnline = true

    private let monitor = NWPathMonitor()

    private init() {
        monitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor in
                self?.isOnline = path.status == .satisfied
            }
        }
        monitor.start(queue: DispatchQueue(label: "com.aboooooo57.lexis.network-monitor"))
    }
}
