package com.aboooooo57.lexume.ui.settings

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExposedDropdownMenu
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aboooooo57.lexume.data.local.AppPreferences
import com.aboooooo57.lexume.data.local.SecretKey
import com.aboooooo57.lexume.data.local.SecureKeyStore
import com.aboooooo57.lexume.data.model.TargetLanguage
import com.aboooooo57.lexume.network.KeyValidator
import kotlinx.coroutines.launch

/**
 * First-run screen: collect the two optional API keys (verified with live
 * "Test" calls, stored via [SecureKeyStore]) and the preferred translation
 * language. Mirrors `Settings/OnboardingSheet.swift`. Without a Gemini key,
 * Lexume still works - it reads PDFs and photos with on-device OCR instead
 * (M4).
 */
@Composable
fun OnboardingScreen(
    secureKeyStore: SecureKeyStore,
    appPreferences: AppPreferences,
    onDone: () -> Unit
) {
    val scope = rememberCoroutineScope()

    var geminiKey by remember { mutableStateOf("") }
    var elevenKey by remember { mutableStateOf("") }
    var geminiStatus by remember { mutableStateOf<ApiKeyTestStatus>(ApiKeyTestStatus.Idle) }
    var elevenStatus by remember { mutableStateOf<ApiKeyTestStatus>(ApiKeyTestStatus.Idle) }
    var saveError by remember { mutableStateOf<String?>(null) }
    var targetLanguage by remember { mutableStateOf("Persian") }
    var languageMenuExpanded by remember { mutableStateOf(false) }

    // Loads any keys already saved (e.g. this screen reopened via Settings
    // -> General -> "Show Welcome Screen Again") - mirrors OnboardingSheet's
    // `.onAppear`.
    LaunchedEffect(Unit) {
        geminiKey = secureKeyStore.get(SecretKey.GEMINI_API_KEY) ?: ""
        elevenKey = secureKeyStore.get(SecretKey.ELEVENLABS_API_KEY) ?: ""
    }
    LaunchedEffect(Unit) {
        appPreferences.targetLanguage.collect { targetLanguage = it }
    }

    fun setTargetLanguage(name: String) {
        targetLanguage = name
        scope.launch { appPreferences.setTargetLanguage(name) }
    }

    fun saveAndStart() {
        scope.launch {
            secureKeyStore.set(geminiKey, SecretKey.GEMINI_API_KEY)
            secureKeyStore.set(elevenKey, SecretKey.ELEVENLABS_API_KEY)
            // Completing setup - even with just one of the two optional keys
            // - shouldn't keep re-prompting on every launch just because the
            // other key was left blank.
            appPreferences.setHasDismissedOnboarding(true)
            saveError = null
            onDone()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp)
    ) {
        Text("Welcome to Lexume", style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.height(6.dp))
        Text(
            "Lexume talks directly to Google Gemini (text extraction) and ElevenLabs " +
                "(narration). Both are optional: without a Gemini key, Lexume reads PDFs " +
                "and photos with on-device OCR instead — free, offline, no account needed. " +
                "Keys you do add are stored only in this device's secure storage.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(Modifier.height(24.dp))
        ApiKeyField(
            title = "Google Gemini API key",
            subtitle = "Free at aistudio.google.com/app/apikey",
            value = geminiKey,
            onValueChange = { geminiKey = it },
            status = geminiStatus,
            onTest = {
                geminiStatus = ApiKeyTestStatus.Testing
                val result = KeyValidator.testGeminiKey(geminiKey.trim())
                geminiStatus = statusFrom(result)
            }
        )

        Spacer(Modifier.height(18.dp))
        ApiKeyField(
            title = "ElevenLabs API key",
            subtitle = "elevenlabs.io → Settings → API Keys",
            value = elevenKey,
            onValueChange = { elevenKey = it },
            status = elevenStatus,
            onTest = {
                elevenStatus = ApiKeyTestStatus.Testing
                val result = KeyValidator.testElevenLabsKey(elevenKey.trim())
                elevenStatus = statusFrom(result)
            }
        )

        Spacer(Modifier.height(24.dp))
        Text("Translation language", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(6.dp))
        ExposedDropdownMenuBox(
            expanded = languageMenuExpanded,
            onExpandedChange = { languageMenuExpanded = it }
        ) {
            OutlinedTextField(
                value = targetLanguage,
                onValueChange = {},
                readOnly = true,
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = languageMenuExpanded) },
                modifier = Modifier.menuAnchor().fillMaxWidth()
            )
            ExposedDropdownMenu(
                expanded = languageMenuExpanded,
                onDismissRequest = { languageMenuExpanded = false }
            ) {
                TargetLanguage.all.forEach { language ->
                    DropdownMenuItem(
                        text = { Text(language.displayName) },
                        onClick = {
                            setTargetLanguage(language.displayName)
                            languageMenuExpanded = false
                        }
                    )
                }
            }
        }
        Spacer(Modifier.height(4.dp))
        Text(
            "Word lookups and paragraph translations use this language. Change it any time " +
                "in Settings → Reading.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        saveError?.let {
            Spacer(Modifier.height(12.dp))
            Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error)
        }

        Spacer(Modifier.height(24.dp))
        Row(modifier = Modifier.fillMaxWidth()) {
            TextButton(onClick = {
                scope.launch {
                    appPreferences.setHasDismissedOnboarding(true)
                    onDone()
                }
            }) {
                Text("Don't Show Again")
            }
            TextButton(onClick = onDone) {
                Text("Skip for Now")
            }
            Spacer(Modifier.weight(1f))
            TextButton(
                onClick = { saveAndStart() },
                enabled = geminiKey.trim().isNotEmpty() || elevenKey.trim().isNotEmpty()
            ) {
                Text("Save & Start")
            }
        }
    }
}

private fun statusFrom(result: KeyValidator.Result): ApiKeyTestStatus = when (result) {
    is KeyValidator.Result.Valid -> ApiKeyTestStatus.Ok
    is KeyValidator.Result.Invalid -> ApiKeyTestStatus.Failed(result.reason)
}
