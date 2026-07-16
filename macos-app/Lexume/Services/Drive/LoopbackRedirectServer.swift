import Foundation
import Network

/// A single-use local HTTP listener on an OS-assigned port, used to catch
/// the OAuth redirect for Google's "Desktop app" client type. That client
/// type rejects custom URL schemes as a redirect_uri (Google's server
/// returns "Custom URI scheme is not enabled for your client") — only a
/// loopback address is accepted, per RFC 8252. All mutable state is
/// confined to `queue`, so this type is safe to share across the async
/// call in `GoogleAuth` despite not being an actor.
final class LoopbackRedirectServer: @unchecked Sendable {
    struct RedirectResult {
        var code: String?
        var state: String?
        var errorDescription: String?
    }

    private var listener: NWListener?
    private let queue = DispatchQueue(label: "com.aboooooo57.lexume.oauth-loopback")
    private var redirectContinuation: CheckedContinuation<RedirectResult, Error>?
    private var pendingResult: Result<RedirectResult, Error>?

    /// Guards `continuation.resume` from firing twice. A plain local `var`
    /// captured and mutated from `NWListener.stateUpdateHandler` trips
    /// Swift's concurrency checker (that closure's signature is `@Sendable`,
    /// so it can't statically see that it only ever runs serially on
    /// `queue`, same as everything else in `start()`) — wrapping the flag in
    /// its own reference type sidesteps the "captured var" diagnostic. Real
    /// safety still comes from `queue` serializing every callback here.
    private final class ResumeGuard: @unchecked Sendable {
        var didResume = false
    }

    /// Starts listening on an OS-assigned loopback port and returns that port.
    /// Call `waitForRedirect()` afterwards to suspend until the browser
    /// completes the OAuth hop.
    func start() async throws -> UInt16 {
        try await withCheckedThrowingContinuation { continuation in
            queue.async { [self] in
                do {
                    let listener = try NWListener(using: .tcp, on: .any)
                    self.listener = listener
                    let resumeGuard = ResumeGuard()

                    listener.newConnectionHandler = { [weak self] connection in
                        self?.handle(connection)
                    }
                    listener.stateUpdateHandler = { state in
                        switch state {
                        case .ready:
                            guard !resumeGuard.didResume else { return }
                            resumeGuard.didResume = true
                            continuation.resume(returning: listener.port?.rawValue ?? 0)
                        case .failed(let error):
                            guard !resumeGuard.didResume else { return }
                            resumeGuard.didResume = true
                            continuation.resume(throwing: error)
                        default:
                            break
                        }
                    }
                    listener.start(queue: queue)
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }

    /// Suspends until the browser redirect arrives (or resolves immediately
    /// if it already arrived before this was called).
    func waitForRedirect() async throws -> RedirectResult {
        try await withCheckedThrowingContinuation { continuation in
            queue.async { [self] in
                if let pendingResult {
                    self.pendingResult = nil
                    continuation.resume(with: pendingResult)
                } else {
                    self.redirectContinuation = continuation
                }
            }
        }
    }

    private func handle(_ connection: NWConnection) {
        connection.start(queue: queue)
        connection.receive(minimumIncompleteLength: 1, maximumLength: 8192) { [weak self] data, _, _, error in
            guard let self else { return }
            self.queue.async {
                let result: Result<RedirectResult, Error>
                if let error {
                    result = .failure(error)
                } else if let data, let requestText = String(data: data, encoding: .utf8),
                          let requestLine = requestText.split(separator: "\r\n").first,
                          let path = requestLine.split(separator: " ").dropFirst().first {
                    result = .success(Self.parseRedirect(path: String(path)))
                } else {
                    result = .failure(LexumeError.driveSync("Couldn't read Google's sign-in response."))
                }
                self.respond(on: connection)
                self.listener?.cancel()
                if let continuation = self.redirectContinuation {
                    self.redirectContinuation = nil
                    continuation.resume(with: result)
                } else {
                    self.pendingResult = result
                }
            }
        }
    }

    private func respond(on connection: NWConnection) {
        let body = """
        <html><body style="font-family: -apple-system; text-align:center; padding-top:80px;">
        <h2>You're signed in.</h2><p>You can close this tab and return to Lexume.</p>
        </body></html>
        """
        let response = "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: \(body.utf8.count)\r\nConnection: close\r\n\r\n\(body)"
        connection.send(content: Data(response.utf8), completion: .contentProcessed { _ in
            connection.cancel()
        })
    }

    private static func parseRedirect(path: String) -> RedirectResult {
        guard let components = URLComponents(string: "http://127.0.0.1\(path)"),
              let items = components.queryItems
        else {
            return RedirectResult(code: nil, state: nil, errorDescription: "Malformed redirect from Google.")
        }
        let dict = Dictionary(uniqueKeysWithValues: items.map { ($0.name, $0.value ?? "") })
        return RedirectResult(code: dict["code"], state: dict["state"], errorDescription: dict["error"])
    }
}
