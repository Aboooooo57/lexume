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
import androidx.compose.material3.Switch
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
import com.aboooooo57.lexume.data.model.TargetLanguage
import kotlinx.coroutines.launch

private val readingThemes = listOf("system" to "System", "light" to "Light", "dark" to "Dark", "sepia" to "Sepia")
private val fontFamilies = listOf("sans" to "Sans-serif", "serif" to "Serif", "mono" to "Monospace")
private val translationEngines = listOf("google" to "Google (fast)", "gemini" to "Gemini (accurate)")
private val audioModes = listOf(
    "auto" to "Automatically per page",
    "manual" to "Manually (ask me)",
    "off" to "Never"
)

/** Mirrors `Settings/SettingsView.swift`'s `ReadingSettingsTab`. */
@Composable
fun ReadingTab(appPreferences: AppPreferences) {
    val scope = rememberCoroutineScope()

    val readingTheme by appPreferences.readingTheme.collectAsState(initial = "system")
    val fontFamily by appPreferences.fontFamily.collectAsState(initial = "sans")
    val fontSize by appPreferences.fontSize.collectAsState(initial = 18f)
    val targetLanguage by appPreferences.targetLanguage.collectAsState(initial = "Persian")
    val translationEngine by appPreferences.translationEngine.collectAsState(initial = "google")
    val audioMode by appPreferences.audioMode.collectAsState(initial = "manual")
    val warnBeforeLongPageAudio by appPreferences.warnBeforeLongPageAudio.collectAsState(initial = true)

    var themeMenuExpanded by remember { mutableStateOf(false) }
    var fontMenuExpanded by remember { mutableStateOf(false) }
    var languageMenuExpanded by remember { mutableStateOf(false) }
    var engineMenuExpanded by remember { mutableStateOf(false) }
    var audioMenuExpanded by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp)
    ) {
        Text("Appearance", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))
        LabeledDropdown(
            label = "Reading theme",
            options = readingThemes,
            selected = readingTheme,
            expanded = themeMenuExpanded,
            onExpandedChange = { themeMenuExpanded = it },
            onSelect = { scope.launch { appPreferences.setReadingTheme(it) } }
        )
        Spacer(Modifier.height(12.dp))
        LabeledDropdown(
            label = "Font",
            options = fontFamilies,
            selected = fontFamily,
            expanded = fontMenuExpanded,
            onExpandedChange = { fontMenuExpanded = it },
            onSelect = { scope.launch { appPreferences.setFontFamily(it) } }
        )
        Spacer(Modifier.height(12.dp))
        Text("Font size", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Slider(
                value = fontSize,
                onValueChange = { scope.launch { appPreferences.setFontSize(it) } },
                valueRange = 12f..42f,
                steps = 29,
                modifier = Modifier.weight(1f)
            )
            Text(
                "${fontSize.toInt()} pt",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.width(44.dp)
            )
        }

        HorizontalDivider(modifier = Modifier.padding(vertical = 20.dp))

        Text("Translation", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))
        LabeledDropdown(
            label = "Target language",
            options = TargetLanguage.all.map { it.displayName to it.displayName },
            selected = targetLanguage,
            expanded = languageMenuExpanded,
            onExpandedChange = { languageMenuExpanded = it },
            onSelect = { scope.launch { appPreferences.setTargetLanguage(it) } }
        )
        Spacer(Modifier.height(12.dp))
        LabeledDropdown(
            label = "Engine",
            options = translationEngines,
            selected = translationEngine,
            expanded = engineMenuExpanded,
            onExpandedChange = { engineMenuExpanded = it },
            onSelect = { scope.launch { appPreferences.setTranslationEngine(it) } }
        )

        HorizontalDivider(modifier = Modifier.padding(vertical = 20.dp))

        Text("Narration", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))
        LabeledDropdown(
            label = "Generate audio",
            options = audioModes,
            selected = audioMode,
            expanded = audioMenuExpanded,
            onExpandedChange = { audioMenuExpanded = it },
            onSelect = { scope.launch { appPreferences.setAudioMode(it) } }
        )
        Spacer(Modifier.height(12.dp))
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text("Warn before narrating long pages", modifier = Modifier.weight(1f))
            Switch(
                checked = warnBeforeLongPageAudio,
                onCheckedChange = { scope.launch { appPreferences.setWarnBeforeLongPageAudio(it) } }
            )
        }
        Spacer(Modifier.height(4.dp))
        Text(
            "Pages over 3,000 characters cost more to narrate with ElevenLabs; Lexume asks " +
                "first unless you turn this off.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
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
            options.forEach { (tag, optionLabel) ->
                DropdownMenuItem(
                    text = { Text(optionLabel) },
                    onClick = {
                        onSelect(tag)
                        onExpandedChange(false)
                    }
                )
            }
        }
    }
}
