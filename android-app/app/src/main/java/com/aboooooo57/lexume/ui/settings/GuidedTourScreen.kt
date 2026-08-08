package com.aboooooo57.lexume.ui.settings

import androidx.compose.animation.Crossfade
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Translate
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

private data class TourPage(val icon: ImageVector, val title: String, val body: String)

private val tourPages = listOf(
    TourPage(
        icon = Icons.Filled.MenuBook,
        title = "Welcome to Lexume",
        body = "Turn a PDF, photo, or pasted text into a narrated, tap-to-define reading " +
            "session. In the Library tab, use Open File or Paste Text to get started."
    ),
    TourPage(
        icon = Icons.Filled.Description,
        title = "Import almost anything",
        body = "PDFs, photos, and plain text all become clean, readable prose - with a Gemini " +
            "key, extraction is AI-cleaned; without one, on-device OCR reads PDFs and photos " +
            "free and offline."
    ),
    TourPage(
        icon = Icons.Filled.Search,
        title = "Look up any word",
        body = "Tap any word for Lexume's own dictionary sheet: definition, phonetics, " +
            "translation, and synonyms - tap a word inside a definition to keep looking deeper."
    ),
    TourPage(
        icon = Icons.Filled.VolumeUp,
        title = "Listen along",
        body = "Generate narration for a page and follow along as each word highlights in " +
            "sync. Play, pause, skip, and pick up right where you left off next time."
    ),
    TourPage(
        icon = Icons.Filled.Translate,
        title = "Translate & remember",
        body = "Translate any paragraph into your chosen language, and bookmark paragraphs to " +
            "find them later. Every word you look up is saved automatically to Vocabulary."
    ),
    TourPage(
        icon = Icons.Filled.Key,
        title = "Your keys, your data",
        body = "Add your own Gemini/ElevenLabs API keys any time in Settings, and optionally " +
            "back up your library to your own Google Drive. Nothing goes through a Lexume " +
            "server - it's all direct."
    )
)

/**
 * A short guided tour of Lexume's main features - separate from
 * [OnboardingScreen] (which only collects API keys). Shown automatically
 * once, right after onboarding finishes (or on launch if onboarding was
 * already dismissed in an earlier session but this hasn't been seen yet),
 * and reachable any time from Settings -> General. Mirrors
 * `Settings/GuidedTourSheet.swift`.
 */
@Composable
fun GuidedTourScreen(onDone: () -> Unit) {
    var pageIndex by remember { mutableIntStateOf(0) }
    val haptic = LocalHapticFeedback.current

    fun goTo(index: Int) {
        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
        pageIndex = index
    }

    Scaffold { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(28.dp)
        ) {
            Crossfade(
                targetState = pageIndex,
                modifier = Modifier.weight(1f).fillMaxWidth(),
                label = "guided-tour-page"
            ) { index ->
                val page = tourPages[index]
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        page.icon,
                        contentDescription = null,
                        modifier = Modifier.size(52.dp),
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(Modifier.height(18.dp))
                    Text(page.title, style = MaterialTheme.typography.titleLarge)
                    Spacer(Modifier.height(8.dp))
                    Text(
                        page.body,
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.widthIn(max = 400.dp)
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center
            ) {
                tourPages.indices.forEach { index ->
                    Box(
                        modifier = Modifier
                            .padding(horizontal = 3.5.dp)
                            .size(7.dp)
                            .clip(CircleShape)
                            .background(
                                if (index == pageIndex) MaterialTheme.colorScheme.primary
                                else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f)
                            )
                            .clickable { goTo(index) }
                    )
                }
            }
            Spacer(Modifier.height(20.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(onClick = onDone) { Text("Skip") }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (pageIndex > 0) {
                        TextButton(onClick = { goTo(pageIndex - 1) }) { Text("Back") }
                        Spacer(Modifier.width(8.dp))
                    }
                    if (pageIndex < tourPages.lastIndex) {
                        Button(onClick = { goTo(pageIndex + 1) }) { Text("Next") }
                    } else {
                        Button(onClick = onDone) { Text("Done") }
                    }
                }
            }
        }
    }
}

