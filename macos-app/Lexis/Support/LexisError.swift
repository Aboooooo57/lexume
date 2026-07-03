import Foundation

enum LexisError: Error, LocalizedError {
    case missingAPIKey(service: String)
    case rateLimited(service: String)
    case httpFailure(service: String, status: Int, body: String)
    case decodingFailure(service: String, underlying: String)
    case offline
    case notFound(String)

    var errorDescription: String? {
        switch self {
        case .missingAPIKey(let service):
            return "\(service) needs an API key. Add one in Settings (⌘,)."
        case .rateLimited(let service):
            return "\(service) is rate-limiting requests. Please try again in a minute."
        case .httpFailure(let service, let status, let body):
            let detail = body.isEmpty ? "" : " — \(body.prefix(200))"
            return "\(service) returned HTTP \(status)\(detail)"
        case .decodingFailure(let service, let underlying):
            return "Couldn't understand \(service)'s response: \(underlying)"
        case .offline:
            return "You appear to be offline. Cached sessions remain readable."
        case .notFound(let what):
            return "\(what) not found."
        }
    }
}
