import AppKit
import CryptoKit
import Foundation
import Security

/// Native OAuth 2.0 for a Google "Desktop app" client, using the PKCE +
/// loopback-redirect flow Google requires for that client type. The user
/// creates their own OAuth client in their own Google Cloud project (see
/// README) and pastes its Client ID/Secret into Settings; nothing is baked
/// into this binary.
@MainActor
@Observable
final class GoogleAuth {
    static let scope = "https://www.googleapis.com/auth/drive.file"

    private(set) var isSignedIn: Bool
    private var accessToken: String?
    private var accessTokenExpiry: Date?

    private let secrets: SecretsStore

    init(secrets: SecretsStore = KeychainStore()) {
        self.secrets = secrets
        self.isSignedIn = secrets.get(.driveRefreshToken) != nil
    }

    func signIn(clientID: String, clientSecret: String) async throws {
        let verifier = Self.randomURLSafeString(length: 64)
        let challenge = Self.codeChallenge(forVerifier: verifier)
        let state = Self.randomURLSafeString(length: 16)

        let server = LoopbackRedirectServer()
        let port = try await server.start()
        let redirectURI = "http://127.0.0.1:\(port)/"

        guard var components = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth") else {
            throw LexisError.driveSync("Couldn't build the Google sign-in URL.")
        }
        components.queryItems = [
            URLQueryItem(name: "client_id", value: clientID),
            URLQueryItem(name: "redirect_uri", value: redirectURI),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "scope", value: Self.scope),
            URLQueryItem(name: "code_challenge", value: challenge),
            URLQueryItem(name: "code_challenge_method", value: "S256"),
            URLQueryItem(name: "access_type", value: "offline"),
            URLQueryItem(name: "prompt", value: "consent"),
            URLQueryItem(name: "state", value: state),
        ]
        guard let authURL = components.url else {
            throw LexisError.driveSync("Couldn't build the Google sign-in URL.")
        }

        NSWorkspace.shared.open(authURL)
        let result = try await server.waitForRedirect()

        guard result.state == state else {
            throw LexisError.driveSync("Google's sign-in response didn't match this request. Please try again.")
        }
        guard let code = result.code else {
            throw LexisError.driveSync(result.errorDescription ?? "Google sign-in was cancelled.")
        }

        let tokens = try await Self.exchangeCode(
            code: code, clientID: clientID, clientSecret: clientSecret,
            verifier: verifier, redirectURI: redirectURI
        )
        guard let refreshToken = tokens.refreshToken else {
            throw LexisError.driveSync("Google didn't return a refresh token. Try disconnecting any prior Lexis access at myaccount.google.com/permissions and signing in again.")
        }
        try secrets.set(refreshToken, for: .driveRefreshToken)
        accessToken = tokens.accessToken
        accessTokenExpiry = Date().addingTimeInterval(tokens.expiresIn)
        isSignedIn = true
    }

    func signOut() {
        try? secrets.delete(.driveRefreshToken)
        accessToken = nil
        accessTokenExpiry = nil
        isSignedIn = false
    }

    /// Returns a valid access token, refreshing via the stored refresh token if needed.
    func validAccessToken(clientID: String, clientSecret: String) async throws -> String {
        if let accessToken, let accessTokenExpiry, accessTokenExpiry > Date().addingTimeInterval(60) {
            return accessToken
        }
        guard let refreshToken = secrets.get(.driveRefreshToken) else {
            throw LexisError.driveSync("Not connected to Google Drive. Connect in Settings first.")
        }
        let tokens = try await Self.refresh(refreshToken: refreshToken, clientID: clientID, clientSecret: clientSecret)
        accessToken = tokens.accessToken
        accessTokenExpiry = Date().addingTimeInterval(tokens.expiresIn)
        isSignedIn = true
        return tokens.accessToken
    }

    // MARK: - Token exchange

    private struct TokenResponse: Decodable {
        var accessToken: String
        var expiresIn: Double
        var refreshToken: String?

        enum CodingKeys: String, CodingKey {
            case accessToken = "access_token"
            case expiresIn = "expires_in"
            case refreshToken = "refresh_token"
        }
    }

    private static func exchangeCode(
        code: String, clientID: String, clientSecret: String, verifier: String, redirectURI: String
    ) async throws -> (accessToken: String, refreshToken: String?, expiresIn: Double) {
        let params = [
            "code": code,
            "client_id": clientID,
            "client_secret": clientSecret,
            "code_verifier": verifier,
            "grant_type": "authorization_code",
            "redirect_uri": redirectURI,
        ]
        let decoded: TokenResponse = try await postToken(params: params)
        return (decoded.accessToken, decoded.refreshToken, decoded.expiresIn)
    }

    private static func refresh(
        refreshToken: String, clientID: String, clientSecret: String
    ) async throws -> (accessToken: String, expiresIn: Double) {
        let params = [
            "refresh_token": refreshToken,
            "client_id": clientID,
            "client_secret": clientSecret,
            "grant_type": "refresh_token",
        ]
        let decoded: TokenResponse = try await postToken(params: params)
        return (decoded.accessToken, decoded.expiresIn)
    }

    private static func postToken(params: [String: String]) async throws -> TokenResponse {
        var request = URLRequest(url: URL(string: "https://oauth2.googleapis.com/token")!)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        request.httpBody = formEncode(params)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            let status = (response as? HTTPURLResponse)?.statusCode ?? -1
            let bodyText = String(data: data, encoding: .utf8) ?? ""
            throw LexisError.httpFailure(service: "Google", status: status, body: bodyText)
        }
        do {
            return try JSONDecoder().decode(TokenResponse.self, from: data)
        } catch {
            throw LexisError.decodingFailure(service: "Google", underlying: error.localizedDescription)
        }
    }

    private static func formEncode(_ params: [String: String]) -> Data {
        let allowed = CharacterSet.urlQueryAllowed.subtracting(CharacterSet(charactersIn: "+&="))
        let pairs = params.map { key, value -> String in
            let encodedKey = key.addingPercentEncoding(withAllowedCharacters: allowed) ?? key
            let encodedValue = value.addingPercentEncoding(withAllowedCharacters: allowed) ?? value
            return "\(encodedKey)=\(encodedValue)"
        }
        return Data(pairs.joined(separator: "&").utf8)
    }

    // MARK: - PKCE

    private static func randomURLSafeString(length: Int) -> String {
        var bytes = [UInt8](repeating: 0, count: length)
        _ = SecRandomCopyBytes(kSecRandomDefault, length, &bytes)
        return base64URLEncode(Data(bytes))
    }

    private static func codeChallenge(forVerifier verifier: String) -> String {
        let digest = SHA256.hash(data: Data(verifier.utf8))
        return base64URLEncode(Data(digest))
    }

    private static func base64URLEncode(_ data: Data) -> String {
        data.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}
