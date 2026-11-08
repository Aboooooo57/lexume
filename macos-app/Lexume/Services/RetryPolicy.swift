import Foundation

/// Thrown by a service call to signal "retry me" — RetryPolicy catches this
/// specifically and backs off; any other error propagates immediately.
enum RetryableError: Error {
    case rateLimited
}

extension Notification.Name {
    /// Posted before a rate-limit backoff sleep; userInfo["seconds"] is the wait.
    static let serviceRetrying = Notification.Name("com.aboooooo57.lexume.serviceRetrying")
}

enum RetryPolicy {
    /// Mirrors the reference backend: up to 5 attempts, backoff (2^attempt)*2 + jitter seconds.
    static func withRetry<T>(
        maxAttempts: Int = 5,
        serviceName: String,
        _ operation: () async throws -> T
    ) async throws -> T {
        for attempt in 0..<maxAttempts {
            do {
                return try await operation()
            } catch RetryableError.rateLimited {
                if attempt == maxAttempts - 1 {
                    throw LexumeError.rateLimited(service: serviceName)
                }
                let delaySeconds = pow(2.0, Double(attempt)) * 2 + Double.random(in: 0...1)
                NotificationCenter.default.post(
                    name: .serviceRetrying, object: nil,
                    userInfo: ["seconds": Int(delaySeconds.rounded(.up)), "service": serviceName]
                )
                try await Task.sleep(nanoseconds: UInt64(delaySeconds * 1_000_000_000))
            }
        }
        throw LexumeError.rateLimited(service: serviceName)
    }
}
