import Foundation

/// Your Google OAuth "Desktop app" client credentials — a one-time developer
/// setup, not something whoever runs the app should ever have to know about
/// or type in. Fill these in once (see README → "Setting up Google Drive
/// backup" for how to create the client in your own Google Cloud project)
/// and rebuild; Settings then shows a plain "Sign in with Google" button.
///
/// Google documents Desktop-app client secrets as not confidential (there's
/// no server to keep it secret from), so baking it in here is the same
/// model Google's own installed-app samples use — but if you'd rather keep
/// it out of git history, add this one file to .gitignore after filling it in.
enum DriveOAuthConfig {
    static let clientID = "YOUR_CLIENT_ID.apps.googleusercontent.com"
    static let clientSecret = "YOUR_CLIENT_SECRET"

    static var isConfigured: Bool {
        !clientID.isEmpty && !clientID.contains("YOUR_CLIENT_ID")
            && !clientSecret.isEmpty && !clientSecret.contains("YOUR_CLIENT_SECRET")
    }
}
