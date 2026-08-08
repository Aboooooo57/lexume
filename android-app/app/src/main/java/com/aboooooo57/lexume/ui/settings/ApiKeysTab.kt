package com.aboooooo57.lexume.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.TextFields
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aboooooo57.lexume.data.local.SecretKey
import com.aboooooo57.lexume.data.local.SecureKeyStore
import com.aboooooo57.lexume.network.KeyValidator
import kotlinx.coroutines.launch

/** Mirrors `Settings/SettingsView.swift`'s `APIKeysSettingsTab`. */
@Composable
fun ApiKeysTab(secureKeyStore: SecureKeyStore, snackbarHostState: SnackbarHostState) {
    val scope = rememberCoroutineScope()

    var geminiKey by remember { mutableStateOf("") }
    var elevenKey by remember { mutableStateOf("") }
    var geminiStatus by remember { mutableStateOf<ApiKeyTestStatus>(ApiKeyTestStatus.Idle) }
    var elevenStatus by remember { mutableStateOf<ApiKeyTestStatus>(ApiKeyTestStatus.Idle) }
    var errorText by remember { mutableStateOf<String?>(null) }
    var hasGeminiKeySaved by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        geminiKey = secureKeyStore.get(SecretKey.GEMINI_API_KEY) ?: ""
        elevenKey = secureKeyStore.get(SecretKey.ELEVENLABS_API_KEY) ?: ""
        hasGeminiKeySaved = geminiKey.isNotEmpty()
    }

    fun save() {
        scope.launch {
            secureKeyStore.set(geminiKey, SecretKey.GEMINI_API_KEY)
            secureKeyStore.set(elevenKey, SecretKey.ELEVENLABS_API_KEY)
            errorText = null
            hasGeminiKeySaved = geminiKey.trim().isNotEmpty()
            snackbarHostState.showSnackbar("Saved.")
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                if (hasGeminiKeySaved) Icons.Filled.AutoAwesome else Icons.Filled.TextFields,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.width(8.dp))
            Text(
                if (hasGeminiKeySaved) {
                    "Currently reading with: Google Gemini"
                } else {
                    "Currently reading with: On-device OCR (no key needed)"
                },
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Spacer(Modifier.height(20.dp))
        ApiKeyField(
            title = "Gemini API key",
            subtitle = "Free at aistudio.google.com/app/apikey",
            value = geminiKey,
            onValueChange = { geminiKey = it },
            status = geminiStatus,
            onTest = {
                geminiStatus = ApiKeyTestStatus.Testing
                geminiStatus = statusFrom(KeyValidator.testGeminiKey(geminiKey.trim()))
            }
        )
        Text(
            "Used for text extraction, key terms, and translation fallback.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 4.dp)
        )

        HorizontalDivider(modifier = Modifier.padding(vertical = 20.dp))

        ApiKeyField(
            title = "ElevenLabs API key",
            subtitle = "elevenlabs.io → Settings → API Keys",
            value = elevenKey,
            onValueChange = { elevenKey = it },
            status = elevenStatus,
            onTest = {
                elevenStatus = ApiKeyTestStatus.Testing
                elevenStatus = statusFrom(KeyValidator.testElevenLabsKey(elevenKey.trim()))
            }
        )
        Text(
            "Used for narration audio. Keys are stored only in this device's secure storage.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 4.dp)
        )

        HorizontalDivider(modifier = Modifier.padding(vertical = 20.dp))

        Text("On-Device OCR", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(6.dp))
        Text(
            "Used automatically in place of Gemini whenever no Gemini key is set — reads " +
                "PDFs and photos for free, entirely on this device (ML Kit).",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        errorText?.let {
            Spacer(Modifier.height(16.dp))
            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
        }

        Spacer(Modifier.height(20.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            Button(onClick = { save() }) {
                Text("Save")
            }
        }
    }
}

private fun statusFrom(result: KeyValidator.Result): ApiKeyTestStatus = when (result) {
    is KeyValidator.Result.Valid -> ApiKeyTestStatus.Ok
    is KeyValidator.Result.Invalid -> ApiKeyTestStatus.Failed(result.reason)
}
