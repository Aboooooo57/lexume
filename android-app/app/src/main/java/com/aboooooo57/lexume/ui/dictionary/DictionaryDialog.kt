package com.aboooooo57.lexume.ui.dictionary

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.HelpOutline
import androidx.compose.material.icons.filled.RestartAlt
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aboooooo57.lexume.data.local.AppPreferences
import com.aboooooo57.lexume.data.local.SecureKeyStore
import com.aboooooo57.lexume.data.model.DictionaryEntry
import com.aboooooo57.lexume.data.repository.SessionRepository
import com.aboooooo57.lexume.network.FallbackDictionaryClient
import com.aboooooo57.lexume.network.GoogleTranslateClient
import com.aboooooo57.lexume.network.PronunciationService
import com.aboooooo57.lexume.ui.reader.ParagraphText
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/**
 * The dictionary panel - mirrors `Dictionary/DictionaryView.swift`'s content
 * (breadcrumb history, header with pronunciation + translate, part-of-speech
 * sections with tap-to-look-up-any-word definitions/examples, synonym
 * chips), presented as a [ModalBottomSheet] rather than a self-positioned
 * floating panel - there's no desktop-style "panel near the cursor"
 * equivalent on Android, and a bottom sheet is the native mobile analog of
 * "content that layers over what you were just reading."
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DictionaryDialog(
    initialWord: String,
    sessionId: String?,
    sessionRepository: SessionRepository,
    appPreferences: AppPreferences,
    secureKeyStore: SecureKeyStore,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val viewModel = remember {
        DictionaryViewModel(
            sessionId = sessionId,
            dictionary = FallbackDictionaryClient(secureKeyStore, appPreferences),
            translation = GoogleTranslateClient(secureKeyStore, appPreferences),
            sessionRepository = sessionRepository,
            appPreferences = appPreferences,
            pronunciation = PronunciationService(context.applicationContext)
        )
    }
    LaunchedEffect(initialWord) { viewModel.lookup(initialWord, resetHistory = true) }
    DisposableEffect(Unit) { onDispose { viewModel.release() } }

    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(modifier = Modifier.fillMaxWidth()) {
            BreadcrumbBar(
                history = viewModel.history,
                onBack = { viewModel.goBack(scope) },
                onJump = { index -> viewModel.jump(index, scope) },
                onReset = { viewModel.reset(scope) },
                onClose = onDismiss
            )
            HorizontalDivider()
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 220.dp, max = 520.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                val entry = viewModel.entry
                when {
                    viewModel.isLoading -> LoadingState(viewModel.currentWord)
                    viewModel.errorMessage != null ->
                        EmptyState(Icons.Filled.WifiOff, viewModel.errorMessage.orEmpty())
                    entry != null -> DictionaryContent(entry, viewModel, scope)
                    else -> EmptyState(
                        Icons.Filled.HelpOutline,
                        "No definition found for \"${viewModel.currentWord}\"."
                    )
                }
            }
        }
    }
}

@Composable
private fun BreadcrumbBar(
    history: List<String>,
    onBack: () -> Unit,
    onJump: (Int) -> Unit,
    onReset: () -> Unit,
    onClose: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = onBack, enabled = history.size > 1, modifier = Modifier.size(28.dp)) {
            Icon(Icons.Filled.ArrowBack, contentDescription = "Back", modifier = Modifier.size(16.dp))
        }
        Spacer(Modifier.width(4.dp))
        LazyRow(
            modifier = Modifier.weight(1f),
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            items(history.size) { index ->
                val isCurrent = index == history.lastIndex
                Surface(
                    shape = RoundedCornerShape(50),
                    color = if (isCurrent) {
                        MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
                    } else {
                        MaterialTheme.colorScheme.surface
                    },
                    onClick = { onJump(index) }
                ) {
                    Text(
                        history[index],
                        style = MaterialTheme.typography.labelMedium.copy(
                            fontWeight = if (isCurrent) FontWeight.SemiBold else FontWeight.Normal
                        ),
                        color = if (isCurrent) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            }
        }
        IconButton(onClick = onReset, enabled = history.size > 1, modifier = Modifier.size(28.dp)) {
            Icon(Icons.Filled.RestartAlt, contentDescription = "Reset to first lookup", modifier = Modifier.size(16.dp))
        }
        IconButton(onClick = onClose, modifier = Modifier.size(28.dp)) {
            Icon(Icons.Filled.Close, contentDescription = "Close", modifier = Modifier.size(16.dp))
        }
    }
}

@Composable
private fun LoadingState(word: String) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 200.dp)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        CircularProgressIndicator()
        Spacer(Modifier.height(10.dp))
        Text(
            "Looking up \"$word\"…",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun EmptyState(icon: ImageVector, message: String) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 200.dp)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            icon,
            contentDescription = null,
            modifier = Modifier.size(28.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
        )
        Spacer(Modifier.height(10.dp))
        Text(
            message,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun DictionaryContent(entry: DictionaryEntry, viewModel: DictionaryViewModel, scope: CoroutineScope) {
    Column(modifier = Modifier.padding(horizontal = 18.dp, vertical = 16.dp)) {
        HeaderSection(entry, viewModel, scope)
    }
    entry.meanings.take(6).forEachIndexed { index, meaning ->
        if (index > 0) HorizontalDivider(modifier = Modifier.padding(horizontal = 18.dp))
        Column(modifier = Modifier.padding(horizontal = 18.dp, vertical = 14.dp)) {
            MeaningSection(meaning, viewModel, scope)
        }
    }
}

@Composable
private fun HeaderSection(entry: DictionaryEntry, viewModel: DictionaryViewModel, scope: CoroutineScope) {
    Row(verticalAlignment = Alignment.Top) {
        Column(modifier = Modifier.weight(1f)) {
            Text(entry.word, style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold))
            val phonetic = entry.phonetic ?: entry.phonetics.firstOrNull { !it.text.isNullOrEmpty() }?.text
            if (!phonetic.isNullOrEmpty()) {
                Text(
                    phonetic,
                    style = MaterialTheme.typography.bodyMedium.copy(fontFamily = FontFamily.Monospace),
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        Spacer(Modifier.width(10.dp))
        val audioUrl = entry.phonetics.firstOrNull { !it.audio.isNullOrEmpty() }?.audio
        IconButton(
            onClick = {
                if (audioUrl != null) {
                    viewModel.playPronunciation(audioUrl)
                } else {
                    // The free dictionary API's audio coverage is
                    // inconsistent - fall back to on-device speech so every
                    // word can still be heard.
                    viewModel.speakWord(entry.word, scope)
                }
            },
            modifier = Modifier
                .size(36.dp)
                .background(color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f), shape = CircleShape)
        ) {
            Icon(Icons.Filled.VolumeUp, contentDescription = "Pronounce", tint = MaterialTheme.colorScheme.primary)
        }
    }
    Spacer(Modifier.height(6.dp))
    TranslateRow(text = entry.word, viewModel = viewModel, scope = scope)
}

@Composable
private fun TranslateRow(
    text: String,
    viewModel: DictionaryViewModel,
    scope: CoroutineScope,
    style: TextStyle = MaterialTheme.typography.bodyMedium
) {
    val isRtl = viewModel.targetLanguage.isRtl
    val isTranslating = viewModel.translatingKeys.contains(text)
    val translated = viewModel.translations[text]
    val hasError = viewModel.translationErrorKeys.contains(text)

    Column(horizontalAlignment = if (isRtl) Alignment.End else Alignment.Start) {
        TextButton(
            onClick = { viewModel.translate(text, scope) },
            enabled = !isTranslating && translated == null,
            contentPadding = PaddingValues(0.dp)
        ) {
            if (isTranslating) {
                CircularProgressIndicator(modifier = Modifier.size(12.dp))
            }
            Spacer(Modifier.width(4.dp))
            Text(
                if (translated == null) "Translate" else viewModel.targetLanguage.displayName,
                style = MaterialTheme.typography.labelSmall
            )
        }
        if (translated != null) {
            Text(
                translated,
                style = style,
                textAlign = if (isRtl) TextAlign.End else TextAlign.Start,
                modifier = Modifier.fillMaxWidth()
            )
        } else if (hasError) {
            Text("Translation failed", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.error)
        }
    }
}

@Composable
private fun MeaningSection(meaning: DictionaryEntry.Meaning, viewModel: DictionaryViewModel, scope: CoroutineScope) {
    Surface(
        shape = RoundedCornerShape(50),
        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
    ) {
        Text(
            meaning.partOfSpeech.lowercase(),
            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
        )
    }
    Spacer(Modifier.height(10.dp))

    meaning.definitions.take(3).forEachIndexed { index, definition ->
        Row(modifier = Modifier.padding(bottom = 10.dp)) {
            Text(
                "${index + 1}.",
                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.width(20.dp)
            )
            Column(modifier = Modifier.weight(1f)) {
                ParagraphText(
                    text = definition.definition,
                    onWordTapped = { word -> scope.launch { viewModel.lookup(word) } },
                    style = MaterialTheme.typography.bodyMedium
                )
                TranslateRow(text = definition.definition, viewModel = viewModel, scope = scope)

                if (!definition.example.isNullOrEmpty()) {
                    Spacer(Modifier.height(4.dp))
                    ParagraphText(
                        text = "“${definition.example}”",
                        onWordTapped = { word -> scope.launch { viewModel.lookup(word) } },
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    )
                    TranslateRow(text = definition.example, viewModel = viewModel, scope = scope)
                }
            }
        }
    }

    if (meaning.synonyms.isNotEmpty()) {
        SynonymChips(meaning.synonyms.take(5)) { synonym -> scope.launch { viewModel.lookup(synonym) } }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SynonymChips(synonyms: List<String>, onSynonymTapped: (String) -> Unit) {
    Text(
        "SYNONYMS",
        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold, fontSize = 9.sp),
        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
        modifier = Modifier.padding(top = 4.dp, bottom = 6.dp)
    )
    // FlowRow, not Row - a plain Row can't wrap, and would clip/overflow
    // off the edge of a phone-width bottom sheet with more than a couple
    // of synonyms (up to 5 here). Mirrors DictionaryView.swift's own
    // FlowLayout use for the same reason.
    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        synonyms.forEach { synonym ->
            Surface(
                shape = RoundedCornerShape(50),
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.1f),
                onClick = { onSynonymTapped(synonym) }
            ) {
                Text(
                    synonym,
                    style = MaterialTheme.typography.labelMedium,
                    modifier = Modifier.padding(horizontal = 9.dp, vertical = 4.dp)
                )
            }
        }
    }
}
