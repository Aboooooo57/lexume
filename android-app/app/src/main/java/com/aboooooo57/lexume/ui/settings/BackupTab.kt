package com.aboooooo57.lexume.ui.settings

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.CloudDownload
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.Login
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.aboooooo57.lexume.data.local.DriveOAuthConfig
import com.aboooooo57.lexume.network.DriveSyncService
import java.text.DateFormat
import kotlinx.coroutines.launch

/**
 * Mirrors `Settings/SettingsView.swift`'s `BackupSettingsTab`. Sign-in is a
 * system Activity Google Play Services provides (see `network/GoogleAuth.kt`'s
 * doc comment) - launched here via the standard
 * `ActivityResultContracts.StartActivityForResult()` pattern, same shape as
 * every SAF file-picker launch elsewhere in this app.
 */
@Composable
fun BackupTab(driveSyncService: DriveSyncService) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val auth = driveSyncService.auth

    LaunchedEffect(Unit) {
        auth.refreshSignedInState()
        driveSyncService.loadLastBackupDate()
    }

    val signInLauncher = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        scope.launch { driveSyncService.completeSignIn(result.data) }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                if (driveSyncService.isSignedIn) Icons.Filled.CloudDone else Icons.Filled.CloudOff,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.width(8.dp))
            Text(
                if (driveSyncService.isSignedIn) "Connected to Google Drive" else "Not connected",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        driveSyncService.lastBackupDate?.let { date ->
            Spacer(Modifier.height(4.dp))
            Text(
                "Last backup: ${DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT).format(date)}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Spacer(Modifier.height(20.dp))

        if (!driveSyncService.isSignedIn) {
            if (DriveOAuthConfig.isConfigured) {
                OutlinedButton(
                    onClick = { signInLauncher.launch(auth.signInIntent(context)) },
                    enabled = !driveSyncService.isSyncing
                ) {
                    Icon(Icons.Filled.Login, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sign in with Google")
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    "A browser tab opens for you to approve access to a private “Lexume” " +
                        "folder in your Drive — Lexume can't see anything else in your Drive.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            } else {
                Text(
                    "Google Drive backup isn't set up for this build yet.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        } else {
            Text("Sync", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(8.dp))
            OutlinedButton(
                onClick = { scope.launch { driveSyncService.backupNow() } },
                enabled = !driveSyncService.isSyncing
            ) {
                Icon(Icons.Filled.CloudUpload, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text("Back Up Now")
            }
            Spacer(Modifier.height(8.dp))
            OutlinedButton(
                onClick = { scope.launch { driveSyncService.restoreNow() } },
                enabled = !driveSyncService.isSyncing
            ) {
                Icon(Icons.Filled.CloudDownload, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text("Restore from Drive")
            }
            Spacer(Modifier.height(8.dp))
            OutlinedButton(
                onClick = { scope.launch { driveSyncService.disconnect() } },
                enabled = !driveSyncService.isSyncing
            ) {
                Icon(Icons.Filled.Logout, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                Spacer(Modifier.width(8.dp))
                Text("Disconnect", color = MaterialTheme.colorScheme.error)
            }
            Spacer(Modifier.height(4.dp))
            Text(
                "Backs up every session's text, narration, bookmarks, and vocabulary to a " +
                    "“Lexume” folder in your Google Drive. Restore adds back any sessions " +
                    "found there that aren't already on this device — it never overwrites or " +
                    "deletes local sessions.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        if (driveSyncService.isSyncing) {
            Spacer(Modifier.height(20.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                Spacer(Modifier.width(8.dp))
                Text(
                    driveSyncService.statusMessage ?: "Working…",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        } else {
            driveSyncService.statusMessage?.let {
                Spacer(Modifier.height(20.dp))
                Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}
