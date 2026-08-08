package com.aboooooo57.lexume.network

import android.content.Intent
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.aboooooo57.lexume.data.local.AppPreferences
import com.aboooooo57.lexume.data.model.DriveFile
import com.aboooooo57.lexume.data.model.SessionBackupPayload
import com.aboooooo57.lexume.data.repository.SessionRepository
import com.aboooooo57.lexume.support.LexumeException
import java.text.DateFormat
import java.util.Date
import kotlinx.coroutines.flow.first
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

/**
 * Mirrors every session (text, timings, bookmarks, vocabulary as JSON;
 * narration as separate .mp3 files) to a "Lexume" folder in the user's own
 * Google Drive, and restores anything found there that isn't already on
 * this device. Manual only (Back Up Now / Restore from Drive in Settings) -
 * there's no background sync loop. Mirrors `Services/Drive/DriveSyncService.swift`.
 */
class DriveSyncService(
    val auth: GoogleAuth,
    private val sessionRepository: SessionRepository,
    private val appPreferences: AppPreferences
) {
    var isSyncing by mutableStateOf(false)
        private set
    var statusMessage by mutableStateOf<String?>(null)
        private set
    var lastBackupDate by mutableStateOf<Date?>(null)
        private set

    val isSignedIn: Boolean get() = auth.isSignedIn

    suspend fun loadLastBackupDate() {
        val iso = appPreferences.driveLastBackup.first() ?: return
        lastBackupDate = try {
            iso8601.parse(iso)
        } catch (e: Exception) {
            null
        }
    }

    /** Call from the sign-in launcher's result callback (see `BackupTab.kt`) once [GoogleAuth.signInIntent]'s Activity returns. */
    suspend fun completeSignIn(data: Intent?) {
        statusMessage = null
        try {
            auth.completeSignIn(data)
            statusMessage = "Connected to Google Drive."
        } catch (e: Exception) {
            statusMessage = "Couldn't connect: ${e.message}"
        }
    }

    suspend fun disconnect() {
        auth.signOut()
        statusMessage = "Disconnected."
    }

    suspend fun backupNow() {
        if (isSyncing) return
        isSyncing = true
        statusMessage = "Backing up…"
        try {
            val token = auth.validAccessToken()
            val folderId = ensureFolder(token)
            val backupSessions = sessionRepository.allSessionsForBackup()

            for (session in backupSessions) {
                val jsonData = session.toJson().toString().toByteArray(Charsets.UTF_8)
                uploadFile(
                    name = "${session.id}.json",
                    mimeType = "application/json",
                    content = jsonData,
                    folderId = folderId,
                    accessToken = token
                )
                for (page in session.pages) {
                    if (!page.hasAudio) continue
                    val audio = sessionRepository.pageAudioData(session.id, page.pageNumber) ?: continue
                    uploadFile(
                        name = "${session.id}-page${page.pageNumber}.mp3",
                        mimeType = "audio/mpeg",
                        content = audio,
                        folderId = folderId,
                        accessToken = token
                    )
                }
            }

            val now = Date()
            lastBackupDate = now
            appPreferences.setDriveLastBackup(iso8601.format(now))
            statusMessage = "Backed up ${backupSessions.size} session${if (backupSessions.size == 1) "" else "s"} to Drive."
        } catch (e: Exception) {
            statusMessage = "Backup failed: ${e.message}"
        } finally {
            isSyncing = false
        }
    }

    suspend fun restoreNow() {
        if (isSyncing) return
        isSyncing = true
        statusMessage = "Restoring…"
        try {
            val token = auth.validAccessToken()
            val folderId = ensureFolder(token)
            val remoteFiles = listFiles(folderId, token)
            val existingIds = sessionRepository.existingSessionIds()

            var imported = 0
            for (file in remoteFiles) {
                if (!file.name.endsWith(".json")) continue
                val data = downloadFile(file.id, token)
                val payload = try {
                    SessionBackupPayload.fromJson(JSONObject(String(data, Charsets.UTF_8)))
                } catch (e: Exception) {
                    continue
                }
                if (existingIds.contains(payload.id.lowercase())) continue

                val audioByPage = mutableMapOf<Int, ByteArray>()
                for (page in payload.pages) {
                    if (!page.hasAudio) continue
                    val audioName = "${payload.id}-page${page.pageNumber}.mp3"
                    val audioFile = remoteFiles.firstOrNull { it.name.equals(audioName, ignoreCase = true) } ?: continue
                    try {
                        audioByPage[page.pageNumber] = downloadFile(audioFile.id, token)
                    } catch (e: Exception) {
                        // Missing/corrupt audio shouldn't block restoring the
                        // session's text - it just comes back without narration.
                    }
                }
                sessionRepository.importSession(payload, audioByPage)
                imported++
            }
            statusMessage = if (imported == 0) {
                "Nothing new to restore."
            } else {
                "Restored $imported session${if (imported == 1) "" else "s"} from Drive."
            }
        } catch (e: Exception) {
            statusMessage = "Restore failed: ${e.message}"
        } finally {
            isSyncing = false
        }
    }

    // MARK: - Drive REST calls

    private suspend fun ensureFolder(accessToken: String): String {
        val query = "mimeType='application/vnd.google-apps.folder' and name='$FOLDER_NAME' and trashed=false"
        val url = "https://www.googleapis.com/drive/v3/files".toHttpUrl()
            .newBuilder()
            .addQueryParameter("q", query)
            .addQueryParameter("fields", "files(id,name)")
            .addQueryParameter("spaces", "drive")
            .build()
        val request = Request.Builder().url(url).authorized(accessToken).build()
        val (statusCode, text) = HttpClients.shared.executeSuspending(request)
        checkOk(statusCode, text)
        val existing = parseFileList(text).firstOrNull()
        if (existing != null) return existing.id

        val metadata = JSONObject()
            .put("name", FOLDER_NAME)
            .put("mimeType", "application/vnd.google-apps.folder")
        val createRequest = Request.Builder()
            .url("https://www.googleapis.com/drive/v3/files")
            .authorized(accessToken)
            .post(metadata.toString().toRequestBody(JSON_MEDIA_TYPE))
            .build()
        val (createStatus, createText) = HttpClients.shared.executeSuspending(createRequest)
        checkOk(createStatus, createText)
        return JSONObject(createText).getString("id")
    }

    private suspend fun listFiles(folderId: String, accessToken: String): List<DriveFile> {
        val url = "https://www.googleapis.com/drive/v3/files".toHttpUrl()
            .newBuilder()
            .addQueryParameter("q", "'$folderId' in parents and trashed=false")
            .addQueryParameter("fields", "files(id,name)")
            .addQueryParameter("pageSize", "1000")
            .build()
        val request = Request.Builder().url(url).authorized(accessToken).build()
        val (statusCode, text) = HttpClients.shared.executeSuspending(request)
        checkOk(statusCode, text)
        return parseFileList(text)
    }

    private suspend fun findFile(name: String, folderId: String, accessToken: String): String? {
        val escapedName = name.replace("'", "\\'")
        val url = "https://www.googleapis.com/drive/v3/files".toHttpUrl()
            .newBuilder()
            .addQueryParameter("q", "name='$escapedName' and '$folderId' in parents and trashed=false")
            .addQueryParameter("fields", "files(id,name)")
            .build()
        val request = Request.Builder().url(url).authorized(accessToken).build()
        val (statusCode, text) = HttpClients.shared.executeSuspending(request)
        checkOk(statusCode, text)
        return parseFileList(text).firstOrNull()?.id
    }

    private suspend fun uploadFile(name: String, mimeType: String, content: ByteArray, folderId: String, accessToken: String) {
        val existingId = findFile(name, folderId, accessToken)
        val metadata = if (existingId == null) {
            JSONObject().put("name", name).put("parents", JSONArray().put(folderId))
        } else {
            JSONObject().put("name", name)
        }

        // OkHttp's own MultipartBody builder, not a hand-rolled boundary -
        // Google Drive's multipart upload just needs "multipart/related"
        // with a JSON metadata part followed by the content part, which
        // MultipartBody.Builder produces correctly (and more safely) on its
        // own once told that media type.
        val body = MultipartBody.Builder()
            .setType("multipart/related".toMediaType())
            .addPart(metadata.toString().toRequestBody(JSON_MEDIA_TYPE))
            .addPart(content.toRequestBody(mimeType.toMediaType()))
            .build()

        val url = if (existingId == null) {
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"
        } else {
            "https://www.googleapis.com/upload/drive/v3/files/$existingId?uploadType=multipart"
        }
        val requestBuilder = Request.Builder().url(url).authorized(accessToken)
        val request = if (existingId == null) requestBuilder.post(body).build() else requestBuilder.patch(body).build()
        val (statusCode, text) = HttpClients.shared.executeSuspending(request)
        checkOk(statusCode, text)
    }

    private suspend fun downloadFile(id: String, accessToken: String): ByteArray {
        val request = Request.Builder()
            .url("https://www.googleapis.com/drive/v3/files/$id?alt=media")
            .authorized(accessToken)
            .build()
        val (statusCode, bytes) = HttpClients.shared.executeSuspendingBytes(request)
        if (statusCode !in 200..299) {
            throw LexumeException.HttpFailure("Google Drive", statusCode, String(bytes, Charsets.UTF_8).take(200))
        }
        return bytes
    }

    private fun parseFileList(text: String): List<DriveFile> {
        val filesArray = JSONObject(text).optJSONArray("files") ?: JSONArray()
        return (0 until filesArray.length()).map { i ->
            val o = filesArray.getJSONObject(i)
            DriveFile(id = o.getString("id"), name = o.getString("name"))
        }
    }

    private fun checkOk(statusCode: Int, body: String) {
        if (statusCode !in 200..299) {
            throw LexumeException.HttpFailure("Google Drive", statusCode, body.take(200))
        }
    }

    private fun Request.Builder.authorized(accessToken: String): Request.Builder =
        addHeader("Authorization", "Bearer $accessToken")

    private companion object {
        const val FOLDER_NAME = "Lexume"
        val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()
        val iso8601: DateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
    }
}
