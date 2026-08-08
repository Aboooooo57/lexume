package com.aboooooo57.lexume.network

import android.content.Context
import android.content.Intent
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.aboooooo57.lexume.data.local.DriveOAuthConfig
import com.aboooooo57.lexume.data.local.SecretKey
import com.aboooooo57.lexume.data.local.SecureKeyStore
import com.aboooooo57.lexume.support.LexumeException
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.common.api.Scope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.FormBody
import okhttp3.Request
import org.json.JSONObject

/**
 * Native Google sign-in for Drive access - the Android analog of
 * `Services/Drive/GoogleAuth.swift`'s PKCE + loopback-redirect flow, but
 * genuinely simpler: Google Sign-In's own system UI (an Activity Google
 * Play Services provides) handles the whole consent screen, so there's no
 * local HTTP server to stand up (per the plan's own tech-stack notes).
 * Requesting `requestServerAuthCode` (with `forceCodeForRefreshToken`) still
 * yields a one-time code this class exchanges for a refresh token itself,
 * kept in [SecureKeyStore] - the same BYO-OAuth-client shape as macOS/iPad
 * (see [DriveOAuthConfig]), not a managed-backend token exchange.
 */
class GoogleAuth(private val secureKeyStore: SecureKeyStore) {
    var isSignedIn by mutableStateOf(false)
        private set

    private var accessToken: String? = null
    private var accessTokenExpiryMillis: Long = 0L

    /** Call once when a screen that cares about sign-in state appears - mirrors GoogleAuth.swift's `init` reading the Keychain synchronously, just as a suspend call instead. */
    suspend fun refreshSignedInState() {
        isSignedIn = secureKeyStore.get(SecretKey.DRIVE_REFRESH_TOKEN) != null
    }

    /** Builds the sign-in Intent for the caller to launch via `ActivityResultContracts.StartActivityForResult()`. */
    fun signInIntent(context: Context): Intent {
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestServerAuthCode(DriveOAuthConfig.WEB_CLIENT_ID, true)
            .requestScopes(Scope(DRIVE_SCOPE))
            .build()
        return GoogleSignIn.getClient(context, gso).signInIntent
    }

    /** Processes the result Intent from [signInIntent]'s launcher, exchanging the returned auth code for a refresh token. */
    suspend fun completeSignIn(data: Intent?): Unit = withContext(Dispatchers.IO) {
        val account = try {
            // getResult(ApiException::class.java), not the no-arg `.result`
            // property - only this typed overload throws ApiException
            // directly on failure; the no-arg one wraps it in a generic
            // RuntimeExecutionException instead.
            GoogleSignIn.getSignedInAccountFromIntent(data).getResult(ApiException::class.java)
        } catch (e: ApiException) {
            throw LexumeException.DriveSync(signInErrorMessage(e))
        }
        val authCode = account.serverAuthCode
            ?: throw LexumeException.DriveSync("Google didn't return an authorization code. Please try again.")
        val tokens = exchangeAuthCode(authCode)
        val refreshToken = tokens.refreshToken
            ?: throw LexumeException.DriveSync(
                "Google didn't return a refresh token. Try removing Lexume's access at " +
                    "myaccount.google.com/permissions and signing in again."
            )
        secureKeyStore.set(refreshToken, SecretKey.DRIVE_REFRESH_TOKEN)
        accessToken = tokens.accessToken
        accessTokenExpiryMillis = System.currentTimeMillis() + (tokens.expiresIn * 1000).toLong()
        isSignedIn = true
    }

    suspend fun signOut() {
        secureKeyStore.delete(SecretKey.DRIVE_REFRESH_TOKEN)
        accessToken = null
        accessTokenExpiryMillis = 0L
        isSignedIn = false
    }

    /** Returns a valid access token, refreshing via the stored refresh token if needed. */
    suspend fun validAccessToken(): String = withContext(Dispatchers.IO) {
        val cached = accessToken
        if (cached != null && accessTokenExpiryMillis > System.currentTimeMillis() + REFRESH_MARGIN_MILLIS) {
            return@withContext cached
        }
        val refreshToken = secureKeyStore.get(SecretKey.DRIVE_REFRESH_TOKEN)
            ?: throw LexumeException.DriveSync("Not connected to Google Drive. Connect in Settings first.")
        val tokens = refresh(refreshToken)
        accessToken = tokens.accessToken
        accessTokenExpiryMillis = System.currentTimeMillis() + (tokens.expiresIn * 1000).toLong()
        isSignedIn = true
        tokens.accessToken
    }

    // MARK: - Token exchange

    private data class TokenResponse(val accessToken: String, val expiresIn: Double, val refreshToken: String?)

    private suspend fun exchangeAuthCode(code: String): TokenResponse = postToken(
        mapOf(
            "code" to code,
            "client_id" to DriveOAuthConfig.WEB_CLIENT_ID,
            "client_secret" to DriveOAuthConfig.CLIENT_SECRET,
            "grant_type" to "authorization_code"
        )
    )

    private suspend fun refresh(refreshToken: String): TokenResponse = postToken(
        mapOf(
            "refresh_token" to refreshToken,
            "client_id" to DriveOAuthConfig.WEB_CLIENT_ID,
            "client_secret" to DriveOAuthConfig.CLIENT_SECRET,
            "grant_type" to "refresh_token"
        )
    )

    private suspend fun postToken(params: Map<String, String>): TokenResponse {
        val formBody = FormBody.Builder().apply {
            params.forEach { (key, value) -> add(key, value) }
        }.build()
        val request = Request.Builder()
            .url("https://oauth2.googleapis.com/token")
            .post(formBody)
            .build()
        val (statusCode, text) = HttpClients.shared.executeSuspending(request)
        if (statusCode !in 200..299) {
            throw LexumeException.HttpFailure("Google", statusCode, text.take(200))
        }
        val json = try {
            JSONObject(text)
        } catch (e: Exception) {
            throw LexumeException.DecodingFailure("Google", e.message ?: "malformed token response")
        }
        return TokenResponse(
            accessToken = json.getString("access_token"),
            expiresIn = json.getDouble("expires_in"),
            refreshToken = if (json.has("refresh_token")) json.getString("refresh_token") else null
        )
    }

    private fun signInErrorMessage(e: ApiException): String = if (e.statusCode == CommonStatusCodes.CANCELED) {
        "Google sign-in was cancelled."
    } else {
        "Google sign-in failed: ${e.message ?: e.statusCode}"
    }

    companion object {
        const val DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file"
        private const val REFRESH_MARGIN_MILLIS = 60_000L
    }
}
