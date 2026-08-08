package com.aboooooo57.lexume.ui.library

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Article
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.ContentPaste
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.aboooooo57.lexume.data.local.AppPreferences
import com.aboooooo57.lexume.data.repository.PageExtractionService
import com.aboooooo57.lexume.data.repository.SessionRepository
import com.aboooooo57.lexume.pdf.PdfPageExtractor
import com.aboooooo57.lexume.ui.components.LexumeSearchField
import java.text.DateFormat as JavaDateFormat

/**
 * Home screen: the session library. Empty state doubles as the import
 * surface. Mirrors `Library/LibraryView.swift`, minus drag-and-drop (no
 * Android equivalent - SAF's file picker and the paste-text dialog, both
 * already reachable from the top bar, cover the same ground) and "Open in
 * New Window" (single-Activity app, nothing to open a new window of).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LibraryScreen(
    sessionRepository: SessionRepository,
    pdfPageExtractor: PdfPageExtractor,
    pageExtractionService: PageExtractionService,
    appPreferences: AppPreferences,
    onOpenSession: (String) -> Unit,
    onOpenSettings: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val viewModel = remember { LibraryViewModel(sessionRepository) }
    LaunchedEffect(Unit) { viewModel.observe() }

    val coordinator = remember {
        ImportCoordinator(
            context = context.applicationContext,
            sessionRepository = sessionRepository,
            pdfPageExtractor = pdfPageExtractor,
            pageExtractionService = pageExtractionService,
            appPreferences = appPreferences
        )
    }
    var isPasteDialogShown by remember { mutableStateOf(false) }
    val openFileLauncher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) coordinator.handlePickedFile(uri, scope)
    }

    var sessionPendingRename by remember { mutableStateOf<SessionSummary?>(null) }
    var renameText by remember { mutableStateOf("") }
    var sessionPendingDelete by remember { mutableStateOf<SessionSummary?>(null) }

    val query = viewModel.searchText.trim()
    val filteredSummaries = if (query.isEmpty()) {
        viewModel.summaries
    } else {
        viewModel.summaries.filter { it.name.contains(query, ignoreCase = true) }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Library") },
                actions = {
                    IconButton(onClick = { isPasteDialogShown = true }) {
                        Icon(Icons.Filled.ContentPaste, contentDescription = "Paste Text")
                    }
                    IconButton(onClick = { openFileLauncher.launch(IMPORT_MIME_TYPES) }) {
                        Icon(Icons.Filled.UploadFile, contentDescription = "Open File…")
                    }
                    IconButton(onClick = onOpenSettings) {
                        Icon(Icons.Filled.Settings, contentDescription = "Settings")
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
            if (viewModel.summaries.isNotEmpty()) {
                LexumeSearchField(
                    value = viewModel.searchText,
                    onValueChange = { viewModel.updateSearchText(it) },
                    placeholder = "Search sessions"
                )
            }

            when {
                viewModel.summaries.isEmpty() -> EmptyLibraryState(
                    onOpenFile = { openFileLauncher.launch(IMPORT_MIME_TYPES) },
                    onPasteText = { isPasteDialogShown = true },
                    modifier = Modifier.weight(1f)
                )
                filteredSummaries.isEmpty() -> Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "No sessions match \"${viewModel.searchText}\"",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                else -> LazyVerticalGrid(
                    columns = GridCells.Adaptive(minSize = 160.dp),
                    contentPadding = PaddingValues(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                ) {
                    items(filteredSummaries, key = { it.id }) { summary ->
                        SessionCard(
                            summary = summary,
                            onClick = { onOpenSession(summary.id) },
                            onRename = {
                                renameText = summary.name
                                sessionPendingRename = summary
                            },
                            onDelete = { sessionPendingDelete = summary }
                        )
                    }
                }
            }
        }
    }

    if (isPasteDialogShown) {
        PasteTextDialog(
            onDismiss = { isPasteDialogShown = false },
            onImport = { text ->
                isPasteDialogShown = false
                coordinator.startPastedText(text, scope)
            }
        )
    }

    val stage = coordinator.stage
    if (stage is ImportStage.SelectingPages) {
        val pdfData = coordinator.pdfDataForSelection
        if (pdfData != null) {
            PdfPageSelectorScreen(
                pdfData = pdfData,
                fileName = stage.fileName,
                pageCount = stage.pageCount,
                selectedIndices = coordinator.selectedIndices,
                onSelectionChange = { coordinator.updateSelectedIndices(it) },
                onConfirm = { coordinator.confirmPageSelection(scope) },
                onCancel = { coordinator.cancelSelection() },
                pdfPageExtractor = pdfPageExtractor
            )
        }
    } else {
        ImportProgressDialog(
            stage = stage,
            onDismiss = { coordinator.dismiss() },
            onReadNow = { sessionId ->
                coordinator.dismiss()
                onOpenSession(sessionId)
            }
        )
    }

    sessionPendingRename?.let { summary ->
        AlertDialog(
            onDismissRequest = { sessionPendingRename = null },
            title = { Text("Rename Session") },
            text = {
                OutlinedTextField(
                    value = renameText,
                    onValueChange = { renameText = it },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.rename(summary.id, renameText, scope)
                    sessionPendingRename = null
                }) {
                    Text("Save")
                }
            },
            dismissButton = {
                TextButton(onClick = { sessionPendingRename = null }) { Text("Cancel") }
            }
        )
    }

    sessionPendingDelete?.let { summary ->
        AlertDialog(
            onDismissRequest = { sessionPendingDelete = null },
            title = { Text("Delete this session?") },
            text = {
                Text(
                    "This deletes the extracted text, narration, bookmarks, and vocabulary for " +
                        "\"${summary.name}\". This can't be undone."
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.delete(summary.id, scope)
                    sessionPendingDelete = null
                }) {
                    Text("Delete", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { sessionPendingDelete = null }) { Text("Cancel") }
            }
        )
    }
}

@Composable
private fun EmptyLibraryState(onOpenFile: () -> Unit, onPasteText: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            Icons.Filled.MenuBook,
            contentDescription = null,
            modifier = Modifier.size(52.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(Modifier.height(10.dp))
        Text("Read anything, learn every word", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(6.dp))
        Text(
            "Import a PDF, photo, text, or Markdown file to turn it into a narrated, " +
                "tap-to-define reading session.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(20.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedButton(onClick = onOpenFile) { Text("Open File…") }
            Button(onClick = onPasteText) { Text("Paste Text") }
        }
    }
}

@Composable
private fun SessionCard(
    summary: SessionSummary,
    onClick: () -> Unit,
    onRename: () -> Unit,
    onDelete: () -> Unit
) {
    var menuExpanded by remember { mutableStateOf(false) }

    Surface(
        shape = RoundedCornerShape(10.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        onClick = onClick
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Icon(
                    sourceIcon(summary.sourceType),
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(Modifier.width(6.dp))
                Text(
                    summary.name,
                    style = MaterialTheme.typography.titleSmall,
                    maxLines = 2,
                    modifier = Modifier.weight(1f)
                )
                Box {
                    IconButton(onClick = { menuExpanded = true }, modifier = Modifier.size(24.dp)) {
                        Icon(Icons.Filled.MoreVert, contentDescription = "More actions")
                    }
                    DropdownMenu(expanded = menuExpanded, onDismissRequest = { menuExpanded = false }) {
                        DropdownMenuItem(
                            text = { Text("Rename…") },
                            onClick = {
                                menuExpanded = false
                                onRename()
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("Delete…", color = MaterialTheme.colorScheme.error) },
                            onClick = {
                                menuExpanded = false
                                onDelete()
                            }
                        )
                    }
                }
            }
            Spacer(Modifier.height(4.dp))
            Text(
                JavaDateFormat.getDateInstance(JavaDateFormat.MEDIUM).format(summary.createdAt),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Filled.Description,
                    contentDescription = null,
                    modifier = Modifier.size(14.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(Modifier.width(3.dp))
                Text(
                    "${summary.lastPage}/${summary.totalPages}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (summary.bookmarkCount > 0) {
                    Spacer(Modifier.width(10.dp))
                    Icon(
                        Icons.Filled.Bookmark,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(Modifier.width(3.dp))
                    Text(
                        "${summary.bookmarkCount}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                if (summary.vocabularyCount > 0) {
                    Spacer(Modifier.width(10.dp))
                    Icon(
                        Icons.Filled.MenuBook,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(Modifier.width(3.dp))
                    Text(
                        "${summary.vocabularyCount}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

internal fun sourceIcon(sourceType: String): ImageVector = when (sourceType) {
    "pdf" -> Icons.Filled.Description
    "image" -> Icons.Filled.Image
    else -> Icons.Filled.Article
}

/** SAF filter for `ActivityResultContracts.OpenDocument()` - mirrors `LibraryView.swift`'s `fileImporter` content types. */
internal val IMPORT_MIME_TYPES = arrayOf(
    "application/pdf",
    "text/plain",
    "text/markdown",
    "image/jpeg",
    "image/png",
    "image/heic",
    "image/heif"
)
