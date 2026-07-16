import Foundation
import Observation
import SwiftData

/// Mirrors every session (text, timings, bookmarks, vocabulary as JSON;
/// narration as separate .mp3 files) to a "Lexume" folder in the user's own
/// Google Drive, and restores anything found there that isn't already on
/// this Mac. Manual only (Back Up Now / Restore from Drive in Settings) —
/// there's no background sync loop.
@MainActor
@Observable
final class DriveSyncService {
    private(set) var isSyncing = false
    private(set) var statusMessage: String?
    private(set) var lastBackupDate: Date?

    let auth: GoogleAuth

    private static let folderName = "Lexume"

    /// `auth` defaults to `nil` (rather than `= GoogleAuth()`) because a
    /// default parameter *value* is evaluated in a nonisolated context even
    /// though this initializer itself is main-actor-isolated — constructing
    /// GoogleAuth (also main-actor-isolated) has to happen in the body instead.
    init(auth: GoogleAuth? = nil) {
        self.auth = auth ?? GoogleAuth()
        if let iso = UserDefaults.standard.string(forKey: AppSettings.driveLastBackupKey) {
            lastBackupDate = ISO8601DateFormatter().date(from: iso)
        }
    }

    var isSignedIn: Bool { auth.isSignedIn }

    func connect() async {
        statusMessage = nil
        do {
            let (clientID, clientSecret) = try credentials()
            try await auth.signIn(clientID: clientID, clientSecret: clientSecret)
            statusMessage = "Connected to Google Drive."
        } catch {
            statusMessage = "Couldn't connect: \(error.localizedDescription)"
        }
    }

    func disconnect() {
        auth.signOut()
        statusMessage = "Disconnected."
    }

    func backupNow(container: ModelContainer) async {
        guard !isSyncing else { return }
        isSyncing = true
        statusMessage = "Backing up…"
        defer { isSyncing = false }
        do {
            let (clientID, clientSecret) = try credentials()
            let token = try await auth.validAccessToken(clientID: clientID, clientSecret: clientSecret)
            let persistence = PersistenceActor(modelContainer: container)
            let folderID = try await ensureFolder(accessToken: token)
            let sessions = try await persistence.allSessionsForBackup()

            for session in sessions {
                let jsonData = try JSONEncoder().encode(session)
                try await uploadFile(
                    named: "\(session.id.uuidString).json",
                    mimeType: "application/json",
                    content: jsonData,
                    folderID: folderID,
                    accessToken: token
                )
                for page in session.pages where page.hasAudio {
                    guard let audio = try await persistence.pageAudioData(sessionID: session.id, pageNumber: page.pageNumber) else {
                        continue
                    }
                    try await uploadFile(
                        named: "\(session.id.uuidString)-page\(page.pageNumber).mp3",
                        mimeType: "audio/mpeg",
                        content: audio,
                        folderID: folderID,
                        accessToken: token
                    )
                }
            }

            let now = Date()
            lastBackupDate = now
            UserDefaults.standard.set(ISO8601DateFormatter().string(from: now), forKey: AppSettings.driveLastBackupKey)
            statusMessage = "Backed up \(sessions.count) session\(sessions.count == 1 ? "" : "s") to Drive."
        } catch {
            statusMessage = "Backup failed: \(error.localizedDescription)"
        }
    }

    func restoreNow(container: ModelContainer) async {
        guard !isSyncing else { return }
        isSyncing = true
        statusMessage = "Restoring…"
        defer { isSyncing = false }
        do {
            let (clientID, clientSecret) = try credentials()
            let token = try await auth.validAccessToken(clientID: clientID, clientSecret: clientSecret)
            let folderID = try await ensureFolder(accessToken: token)
            let remoteFiles = try await listFiles(folderID: folderID, accessToken: token)

            let persistence = PersistenceActor(modelContainer: container)
            let existingIDs = try await persistence.existingSessionIDs()

            var imported = 0
            for file in remoteFiles where file.name.hasSuffix(".json") {
                let data = try await downloadFile(id: file.id, accessToken: token)
                guard let payload = try? JSONDecoder().decode(SessionBackupPayload.self, from: data),
                      !existingIDs.contains(payload.id)
                else { continue }

                var audioByPage: [Int: Data] = [:]
                for page in payload.pages where page.hasAudio {
                    let audioName = "\(payload.id.uuidString)-page\(page.pageNumber).mp3"
                    if let audioFile = remoteFiles.first(where: { $0.name == audioName }) {
                        audioByPage[page.pageNumber] = try? await downloadFile(id: audioFile.id, accessToken: token)
                    }
                }
                try await persistence.importSession(payload, audioByPage: audioByPage)
                imported += 1
            }
            statusMessage = imported == 0
                ? "Nothing new to restore."
                : "Restored \(imported) session\(imported == 1 ? "" : "s") from Drive."
        } catch {
            statusMessage = "Restore failed: \(error.localizedDescription)"
        }
    }

    private func credentials() throws -> (id: String, secret: String) {
        guard DriveOAuthConfig.isConfigured else {
            throw LexumeError.driveSync("Google Drive backup isn't configured for this build yet — see README → Setting up Google Drive backup.")
        }
        return (DriveOAuthConfig.clientID, DriveOAuthConfig.clientSecret)
    }

    // MARK: - Drive REST calls

    private func ensureFolder(accessToken: String) async throws -> String {
        var components = URLComponents(string: "https://www.googleapis.com/drive/v3/files")!
        components.queryItems = [
            URLQueryItem(name: "q", value: "mimeType='application/vnd.google-apps.folder' and name='\(Self.folderName)' and trashed=false"),
            URLQueryItem(name: "fields", value: "files(id,name)"),
            URLQueryItem(name: "spaces", value: "drive"),
        ]
        var request = URLRequest(url: components.url!)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        let (data, response) = try await URLSession.shared.data(for: request)
        try Self.checkOK(response, data: data)
        let list = try JSONDecoder().decode(DriveFileList.self, from: data)
        if let existing = list.files.first { return existing.id }

        var createRequest = URLRequest(url: URL(string: "https://www.googleapis.com/drive/v3/files")!)
        createRequest.httpMethod = "POST"
        createRequest.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        createRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        createRequest.httpBody = try JSONSerialization.data(withJSONObject: [
            "name": Self.folderName, "mimeType": "application/vnd.google-apps.folder",
        ])
        let (createData, createResponse) = try await URLSession.shared.data(for: createRequest)
        try Self.checkOK(createResponse, data: createData)
        return try JSONDecoder().decode(DriveFile.self, from: createData).id
    }

    private func listFiles(folderID: String, accessToken: String) async throws -> [DriveFile] {
        var components = URLComponents(string: "https://www.googleapis.com/drive/v3/files")!
        components.queryItems = [
            URLQueryItem(name: "q", value: "'\(folderID)' in parents and trashed=false"),
            URLQueryItem(name: "fields", value: "files(id,name)"),
            URLQueryItem(name: "pageSize", value: "1000"),
        ]
        var request = URLRequest(url: components.url!)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        let (data, response) = try await URLSession.shared.data(for: request)
        try Self.checkOK(response, data: data)
        return try JSONDecoder().decode(DriveFileList.self, from: data).files
    }

    private func findFile(named name: String, folderID: String, accessToken: String) async throws -> String? {
        var components = URLComponents(string: "https://www.googleapis.com/drive/v3/files")!
        components.queryItems = [
            URLQueryItem(name: "q", value: "name='\(name)' and '\(folderID)' in parents and trashed=false"),
            URLQueryItem(name: "fields", value: "files(id,name)"),
        ]
        var request = URLRequest(url: components.url!)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        let (data, response) = try await URLSession.shared.data(for: request)
        try Self.checkOK(response, data: data)
        return try JSONDecoder().decode(DriveFileList.self, from: data).files.first?.id
    }

    private func uploadFile(named name: String, mimeType: String, content: Data, folderID: String, accessToken: String) async throws {
        let existingID = try await findFile(named: name, folderID: folderID, accessToken: accessToken)
        let boundary = "LexumeBoundary-\(UUID().uuidString)"
        let metadata: [String: Any] = existingID == nil ? ["name": name, "parents": [folderID]] : ["name": name]
        let metadataData = try JSONSerialization.data(withJSONObject: metadata)

        var body = Data()
        body.append(Data("--\(boundary)\r\n".utf8))
        body.append(Data("Content-Type: application/json; charset=UTF-8\r\n\r\n".utf8))
        body.append(metadataData)
        body.append(Data("\r\n--\(boundary)\r\n".utf8))
        body.append(Data("Content-Type: \(mimeType)\r\n\r\n".utf8))
        body.append(content)
        body.append(Data("\r\n--\(boundary)--".utf8))

        let urlString = existingID == nil
            ? "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"
            : "https://www.googleapis.com/upload/drive/v3/files/\(existingID!)?uploadType=multipart"
        var request = URLRequest(url: URL(string: urlString)!)
        request.httpMethod = existingID == nil ? "POST" : "PATCH"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("multipart/related; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.httpBody = body

        let (data, response) = try await URLSession.shared.data(for: request)
        try Self.checkOK(response, data: data)
    }

    private func downloadFile(id: String, accessToken: String) async throws -> Data {
        var request = URLRequest(url: URL(string: "https://www.googleapis.com/drive/v3/files/\(id)?alt=media")!)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        let (data, response) = try await URLSession.shared.data(for: request)
        try Self.checkOK(response, data: data)
        return data
    }

    private static func checkOK(_ response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            let status = (response as? HTTPURLResponse)?.statusCode ?? -1
            let bodyText = String(data: data, encoding: .utf8) ?? ""
            throw LexumeError.httpFailure(service: "Google Drive", status: status, body: bodyText)
        }
    }
}
