package com.aboooooo57.lexume.ui.settings

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
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExposedDropdownMenu
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aboooooo57.lexume.data.local.AppPreferences
import kotlinx.coroutines.launch

private val geminiModels = listOf(
    "gemini-3.5-flash" to "Gemini 3.5 Flash (recommended)",
    "gemini-3.1-pro-preview" to "Gemini 3.1 Pro",
    "gemini-3.1-flash-lite" to "Gemini 3.1 Flash Lite",
    "gemini-2.5-flash" to "Gemini 2.5 Flash",
    "gemini-2.5-pro" to "Gemini 2.5 Pro",
    "gemini-2.5-flash-lite" to "Gemini 2.5 Flash Lite",
    "gemini-2.0-flash" to "Gemini 2.0 Flash"
)

private val elevenModels = listOf(
    "eleven_multilingual_v2" to "Multilingual v2 (recommended)",
    "eleven_turbo_v2_5" to "Turbo v2.5",
    "eleven_flash_v2_5" to "Flash v2.5"
)

/**
 * Mirrors `Settings/SettingsView.swift`'s `ModelsSettingsTab`. The
 * "fetch my ElevenLabs voice library" affordance (calling
 * `ElevenLabsClient().voices()`) is deferred to M7, when an
 * `ElevenLabsClient` actually exists on Android - only the manual Voice ID
 * field and tuning sliders (pure preferences, no network) are wired up now.
 */
@Composable
fun ModelsVoiceTab(appPreferences: AppPreferences) {
    val scope = rememberCoroutineScope()
    val geminiModel by appPreferences.geminiModel.collectAsState(initial = AppPreferences.DEFAULT_GEMINI_MODEL)
    val elevenModel by appPreferences.elevenModel.collectAsState(initial = AppPreferences.DEFAULT_ELEVEN_MODEL)
    val voiceId by appPreferences.voiceId.collectAsState(initial = AppPreferences.DEFAULT_VOICE_ID)
    val stability by appPreferences.stability.collectAsState(initial = 0.5f)
    val similarityBoost by appPreferences.similarityBoost.collectAsState(initial = 0.75f)
    val style by appPreferences.style.collectAsState(initial = 0.0f)
    val speed by appPreferences.speed.collectAsState(initial = 1.0f)

    var geminiMenuExpanded by remember { mutableStateOf(false) }
    var elevenMenuExpanded by remember { mutableStateOf(false) }
    var voiceIdField by remember(voiceId) { mutableStateOf(voiceId) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp)
    ) {
        Text("Gemini", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))
        LabeledDropdown(
            label = "Extraction model",
            options = geminiModels,
            selected = geminiModel,
            expanded = geminiMenuExpanded,
            onExpandedChange = { geminiMenuExpanded = it },
            onSelect = { scope.launch { appPreferences.setGeminiModel(it) } }
        )

        HorizontalDivider(modifier = Modifier.padding(vertical = 20.dp))

        Text("ElevenLabs", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))
        LabeledDropdown(
            label = "Voice model",
            options = elevenModels,
            selected = elevenModel,
            expanded = elevenMenuExpanded,
            onExpandedChange = { elevenMenuExpanded = it },
            onSelect = { scope.launch { appPreferences.setElevenModel(it) } }
        )
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = voiceIdField,
            onValueChange = {
                voiceIdField = it
                scope.launch { appPreferences.setVoiceId(it) }
            },
            label = { Text("Voice ID") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(4.dp))
        Text(
            "Paste any voice ID from elevenlabs.io/voice-library. Fetching your own voice " +
                "library here arrives with narration support (M7).",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        HorizontalDivider(modifier = Modifier.padding(vertical = 20.dp))

        Text("Voice tuning", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))
        LabeledSlider("Stability", stability, 0f..1f) { scope.launch { appPreferences.setStability(it) } }
        LabeledSlider("Similarity", similarityBoost, 0f..1f) { scope.launch { appPreferences.setSimilarityBoost(it) } }
        LabeledSlider("Style", style, 0f..1f) { scope.launch { appPreferences.setStyle(it) } }
        LabeledSlider("Speed", speed, 0.5f..2f) { scope.launch { appPreferences.setSpeed(it) } }
    }
}

@Composable
private fun LabeledDropdown(
    label: String,
    options: List<Pair<String, String>>,
    selected: String,
    expanded: Boolean,
    onExpandedChange: (Boolean) -> Unit,
    onSelect: (String) -> Unit
) {
    val selectedLabel = options.firstOrNull { it.first == selected }?.second ?: selected
    Text(label, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
    Spacer(Modifier.height(4.dp))
    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = onExpandedChange) {
        OutlinedTextField(
            value = selectedLabel,
            onValueChange = {},
            readOnly = true,
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier.menuAnchor().fillMaxWidth()
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { onExpandedChange(false) }) {
            options.forEach { (tag, label) ->
                DropdownMenuItem(
                    text = { Text(label) },
                    onClick = {
                        onSelect(tag)
                        onExpandedChange(false)
                    }
                )
            }
        }
    }
}

@Composable
private fun LabeledSlider(label: String, value: Float, range: ClosedFloatingPointRange<Float>, onChange: (Float) -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(label, modifier = Modifier.width(80.dp), style = MaterialTheme.typography.bodyMedium)
        Slider(value = value, onValueChange = onChange, valueRange = range, modifier = Modifier.weight(1f))
        Text(
            String.format("%.2f", value),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.width(40.dp)
        )
    }
}
