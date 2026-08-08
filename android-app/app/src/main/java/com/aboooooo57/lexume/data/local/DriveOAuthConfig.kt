package com.aboooooo57.lexume.data.local

/**
 * Your Google OAuth "Web application" client credentials - a one-time
 * developer setup, not something whoever runs the app should ever have to
 * know about or type in. Mirrors `Services/Drive/DriveOAuthConfig.swift`,
 * but a Web client, not a Desktop one: Google Sign-In's
 * `requestServerAuthCode(webClientId, ...)` (see `network/GoogleAuth.kt`)
 * specifically needs a Web client's ID to mint a server auth code, even
 * though the exchange for that code into a refresh token still happens
 * on-device, same as the Mac app's own flow. See README -> "Setting up
 * Google Drive backup" for how to create this client (and how it relates
 * to the *separate* Android OAuth client Google also wants registered,
 * keyed by this app's package name + signing certificate, purely to let
 * Google Sign-In's picker recognize this app - that one carries no
 * secret and isn't pasted in here).
 *
 * Google documents Web client secrets as needing to stay confidential
 * server-side in the general case, but for this app's own BYO-credentials
 * model (same reasoning as the Mac app's own comment on this file) baking
 * it into a build you control is the accepted pattern for a native app
 * that mints its own tokens; add this file to .gitignore after filling it
 * in if you'd rather keep it out of git history.
 */
object DriveOAuthConfig {
    const val WEB_CLIENT_ID = "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com"
    const val CLIENT_SECRET = "YOUR_CLIENT_SECRET"

    val isConfigured: Boolean
        get() = WEB_CLIENT_ID.isNotEmpty() && !WEB_CLIENT_ID.contains("YOUR_WEB_CLIENT_ID") &&
            CLIENT_SECRET.isNotEmpty() && !CLIENT_SECRET.contains("YOUR_CLIENT_SECRET")
}
