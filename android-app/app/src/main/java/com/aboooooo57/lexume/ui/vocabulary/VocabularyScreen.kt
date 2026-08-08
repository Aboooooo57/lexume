package com.aboooooo57.lexume.ui.vocabulary

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.FileUpload
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.OpenInNew
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.aboooooo57.lexume.data.repository.SessionRepository
import com.aboooooo57.lexume.support.VocabularyCsvExporter
import com.aboooooo57.lexume.ui.components.LexumeSearchField
import com.aboooooo57.lexume.ui.library.sourceIcon
import java.text.DateFormat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Every logged dictionary lookup, grouped into an expandable tree - one node
 * per session, most recently active first. Mirrors `Library/VocabularyListView.swift`,
 * minus the hand-rolled chevron-centering workaround (Compose's `Icon` in a
 * `Row` centers fine on its own, no `DisclosureGroup` quirk to work around).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VocabularyScreen(sessionRepository: SessionRepository, onOpenSession: (String) -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val viewModel = remember { VocabularyViewModel(sessionRepository) }
    LaunchedEffect(Unit) { viewModel.observe() }

    var expandedSessions by remember { mutableStateOf(setOf<String>()) }
    val isSearching = viewModel.searchText.trim().isNotEmpty()

    val exportLauncher = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("text/csv")) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        val csv = VocabularyCsvExporter.export(viewModel.allEntries)
        scope.launch {
            withContext(Dispatchers.IO) {
                context.contentResolver.openOutputStream(uri)?.use { it.write(csv.toByteArray()) }
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Vocabulary") },
                actions = {
                    IconButton(
                        onClick = { exportLauncher.launch("lexume-vocabulary.csv") },
                        enabled = viewModel.allEntries.isNotEmpty()
                    ) {
                        Icon(Icons.Filled.FileUpload, contentDescription = "Export CSV")
                    }
                }
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            if (viewModel.allEntries.isNotEmpty()) {
                LexumeSearchField(
                    value = viewModel.searchText,
                    onValueChange = { viewModel.updateSearchText(it) },
                    placeholder = "Search words"
                )
            }

            when {
                viewModel.allEntries.isEmpty() -> Box(
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.padding(horizontal = 32.dp)
                    ) {
                        Icon(
                            Icons.Filled.MenuBook,
                            contentDescription = null,
                            modifier = Modifier.size(44.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(Modifier.height(8.dp))
                        Text("No Words Yet", style = MaterialTheme.typography.titleMedium)
                        Spacer(Modifier.height(4.dp))
                        // textAlign is the fix, not horizontalAlignment above -
                        // once this wraps to 2 lines, Text measures itself at
                        // close to the Column's full width, so centering the
                        // (already full-width) box does nothing; textAlign
                        // centers the wrapped lines within that box.
                        Text(
                            "Words you look up while reading will appear here.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center
                        )
                    }
                }
                viewModel.groups.isEmpty() -> Box(
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "No words match \"${viewModel.searchText}\"",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                else -> LazyColumn(modifier = Modifier.weight(1f).fillMaxWidth()) {
                    viewModel.groups.forEach { group ->
                        val expanded = isSearching || expandedSessions.contains(group.sessionId)
                        item(key = "${group.sessionId}-header") {
                            GroupHeader(
                                group = group,
                                expanded = expanded,
                                onToggle = {
                                    if (!isSearching) {
                                        expandedSessions = if (expandedSessions.contains(group.sessionId)) {
                                            expandedSessions - group.sessionId
                                        } else {
                                            expandedSessions + group.sessionId
                                        }
                                    }
                                },
                                onOpen = { onOpenSession(group.sessionId) }
                            )
                        }
                        if (expanded) {
                            items(group.entries, key = { it.id }) { entry ->
                                WordRow(entry)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun GroupHeader(
    group: VocabularySessionGroup,
    expanded: Boolean,
    onToggle: () -> Unit,
    onOpen: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onToggle)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            Icons.Filled.ChevronRight,
            contentDescription = null,
            modifier = Modifier
                .size(16.dp)
                .rotate(if (expanded) 90f else 0f),
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(Modifier.width(8.dp))
        Icon(
            sourceIcon(group.sourceType),
            contentDescription = null,
            modifier = Modifier
                .size(28.dp)
                .background(
                    MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
                    RoundedCornerShape(7.dp)
                )
                .padding(6.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(Modifier.width(10.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(group.name, style = MaterialTheme.typography.titleSmall, maxLines = 1)
            Text(
                "${wordCountText(group.entries.size)} · " +
                    DateFormat.getDateInstance(DateFormat.MEDIUM).format(group.latestLookup),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        IconButton(onClick = onOpen) {
            Icon(
                Icons.Filled.OpenInNew,
                contentDescription = "Open this session in the reader",
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

private fun wordCountText(count: Int): String = if (count == 1) "1 word" else "$count words"

@Composable
private fun WordRow(entry: VocabularyEntryRow) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 56.dp, end = 16.dp, top = 4.dp, bottom = 4.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(entry.word, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
            Text(
                DateFormat.getDateInstance(DateFormat.SHORT).format(entry.createdAt),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        val snippet = entry.definitionSnippet
        if (!snippet.isNullOrEmpty()) {
            Text(
                snippet,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2
            )
        }
    }
}
