package com.aboooooo57.lexume.ui.settings

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.RestartAlt
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aboooooo57.lexume.data.local.AppPreferences
import com.aboooooo57.lexume.data.repository.SessionRepository
import kotlinx.coroutines.launch

/**
 * Mirrors `Settings/SettingsView.swift`'s `GeneralSettingsTab`. "Show Guided
 * Tour Again" is omitted for now - the guided tour itself doesn't exist yet
 * on Android (M11) - add it back alongside that milestone.
 */
@Composable
fun GeneralTab(
    appPreferences: AppPreferences,
    sessionRepository: SessionRepository,
    onReplayOnboarding: () -> Unit
) {
    val scope = rememberCoroutineScope()

    var isClearCacheConfirming by remember { mutableStateOf(false) }
    var isResetConfirming by remember { mutableStateOf(false) }
    var isClearingCache by remember { mutableStateOf(false) }
    var statusMessage by remember { mutableStateOf<String?>(null) }

    fun clearCache() {
        isClearingCache = true
        statusMessage = null
        scope.launch {
            sessionRepository.clearAllCachedPages()
            statusMessage = "Cache cleared."
            isClearingCache = false
        }
    }

    fun resetSettings() {
        scope.launch {
            appPreferences.resetAllToDefaults()
            statusMessage = "Settings reset to defaults."
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp)
    ) {
        Text("Help", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))
        OutlinedButton(onClick = onReplayOnboarding) {
            Icon(Icons.Filled.AutoAwesome, contentDescription = null)
            Spacer(Modifier.width(8.dp))
            Text("Show Welcome Screen Again")
        }
        Spacer(Modifier.height(4.dp))
        Text(
            "Replays the first-run introduction to API keys and on-device OCR. Your saved " +
                "keys are not affected.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        HorizontalDivider(modifier = Modifier.padding(vertical = 20.dp))

        Text("Cache", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))
        OutlinedButton(
            onClick = { isClearCacheConfirming = true },
            enabled = !isClearingCache
        ) {
            Icon(Icons.Filled.Delete, contentDescription = null, tint = MaterialTheme.colorScheme.error)
            Spacer(Modifier.width(8.dp))
            Text("Clear Cached Pages…", color = MaterialTheme.colorScheme.error)
        }
        Spacer(Modifier.height(4.dp))
        Text(
            "Deletes cached extracted text and audio for every session so pages re-extract " +
                "next time you read them — useful after switching Gemini models or voice " +
                "settings. Your sessions and library stay intact.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        HorizontalDivider(modifier = Modifier.padding(vertical = 20.dp))

        Text("Reset", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))
        OutlinedButton(onClick = { isResetConfirming = true }) {
            Icon(Icons.Filled.RestartAlt, contentDescription = null, tint = MaterialTheme.colorScheme.error)
            Spacer(Modifier.width(8.dp))
            Text("Reset All Settings to Defaults…", color = MaterialTheme.colorScheme.error)
        }
        Spacer(Modifier.height(4.dp))
        Text(
            "Restores every preference on the Models & Voice and Reading tabs to its " +
                "default. Saved API keys are not affected.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        statusMessage?.let {
            Spacer(Modifier.height(20.dp))
            Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }

    if (isClearCacheConfirming) {
        AlertDialog(
            onDismissRequest = { isClearCacheConfirming = false },
            title = { Text("Clear all cached pages?") },
            text = {
                Text(
                    "Every session will re-extract its text (and re-narrate its audio) the " +
                        "next time you open it."
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    isClearCacheConfirming = false
                    clearCache()
                }) {
                    Text("Clear Cached Pages", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { isClearCacheConfirming = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    if (isResetConfirming) {
        AlertDialog(
            onDismissRequest = { isResetConfirming = false },
            title = { Text("Reset all settings?") },
            text = {
                Text(
                    "This resets models, voice tuning, reading appearance, and translation " +
                        "choices. It does not remove your API keys."
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    isResetConfirming = false
                    resetSettings()
                }) {
                    Text("Reset to Defaults", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { isResetConfirming = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}
