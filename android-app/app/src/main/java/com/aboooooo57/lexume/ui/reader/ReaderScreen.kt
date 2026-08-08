package com.aboooooo57.lexume.ui.reader

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aboooooo57.lexume.data.local.AppPreferences
import com.aboooooo57.lexume.data.model.ReadingTheme
import com.aboooooo57.lexume.data.model.backgroundColor
import com.aboooooo57.lexume.data.model.foregroundColor
import com.aboooooo57.lexume.data.repository.PageExtractionService
import com.aboooooo57.lexume.data.repository.SessionRepository

/**
 * Reflowed-text reader (M5, Phase 1) - mirrors `Reader/ReaderView.swift`'s
 * reflowed-text path (`reflowedBody`). Original Layout mode, narration, and
 * per-paragraph translate/key-terms chrome aren't ported - those are the
 * reader's own deferred Phase 2, M7, and M6 respectively; this screen is
 * text + navigation + bookmarks + tap-to-define only.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReaderScreen(
    sessionId: String,
    sessionRepository: SessionRepository,
    pageExtractionService: PageExtractionService,
    appPreferences: AppPreferences,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val viewModel = remember(sessionId) {
        ReaderViewModel(sessionId, sessionRepository, pageExtractionService, appPreferences)
    }
    LaunchedEffect(sessionId) { viewModel.start() }

    val readingThemeKey by appPreferences.readingTheme.collectAsState(initial = "system")
    val fontFamilyKey by appPreferences.fontFamily.collectAsState(initial = "sans")
    val fontSize by appPreferences.fontSize.collectAsState(initial = 18f)

    val theme = ReadingTheme.fromStorageKey(readingThemeKey)
    val backgroundColor = theme.backgroundColor()
    val foregroundColor = theme.foregroundColor()
    val fontFamily = when (fontFamilyKey) {
        "serif" -> FontFamily.Serif
        "mono" -> FontFamily.Monospace
        else -> FontFamily.Default
    }
    val textStyle = TextStyle(fontFamily = fontFamily, fontSize = fontSize.sp, color = foregroundColor)

    var isFocusMode by remember { mutableStateOf(false) }
    var lookupWord by remember { mutableStateOf<String?>(null) }

    Scaffold(
        topBar = {
            if (!isFocusMode) {
                TopAppBar(
                    title = { Text(viewModel.overview?.name ?: "Reading") },
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                        }
                    },
                    actions = {
                        IconButton(onClick = { isFocusMode = true }) {
                            Icon(Icons.Filled.Fullscreen, contentDescription = "Enter Focus Mode")
                        }
                    }
                )
            }
        },
        bottomBar = {
            if (!isFocusMode) {
                PagerBar(
                    currentPage = viewModel.currentPageNumber,
                    totalPages = viewModel.overview?.totalPages ?: 1,
                    foregroundColor = foregroundColor,
                    onPrevious = { viewModel.goToPage(viewModel.currentPageNumber - 1, scope) },
                    onNext = { viewModel.goToPage(viewModel.currentPageNumber + 1, scope) }
                )
            }
        },
        containerColor = backgroundColor
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when {
                viewModel.isLoadingPage && viewModel.currentPage == null -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }
                viewModel.loadError != null -> {
                    Column(
                        modifier = Modifier
                            .align(Alignment.Center)
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            Icons.Filled.Warning,
                            contentDescription = null,
                            tint = foregroundColor.copy(alpha = 0.6f)
                        )
                        Spacer(Modifier.height(12.dp))
                        Text(viewModel.loadError ?: "", color = foregroundColor, textAlign = TextAlign.Center)
                        Spacer(Modifier.height(12.dp))
                        Button(onClick = { viewModel.retry(scope) }) { Text("Retry") }
                    }
                }
                viewModel.currentPage != null -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(24.dp)
                    ) {
                        val title = viewModel.currentPage?.title
                        if (!title.isNullOrEmpty()) {
                            item {
                                Text(
                                    title,
                                    style = textStyle.copy(
                                        fontSize = (fontSize + 6).sp,
                                        fontWeight = FontWeight.SemiBold
                                    ),
                                    modifier = Modifier.padding(bottom = 16.dp)
                                )
                            }
                        }
                        itemsIndexed(viewModel.paragraphs) { _, paragraph ->
                            ParagraphRow(
                                paragraph = paragraph,
                                textStyle = textStyle,
                                isBookmarked = viewModel.isBookmarked(paragraph),
                                onToggleBookmark = { viewModel.toggleBookmark(paragraph, scope) },
                                onWordTapped = { lookupWord = it }
                            )
                        }
                    }
                }
                else -> {
                    Text("No content", color = foregroundColor, modifier = Modifier.align(Alignment.Center))
                }
            }

            if (isFocusMode) {
                IconButton(
                    onClick = { isFocusMode = false },
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(14.dp)
                ) {
                    Icon(
                        Icons.Filled.Close,
                        contentDescription = "Exit Focus Mode",
                        tint = foregroundColor.copy(alpha = 0.6f)
                    )
                }
            }
        }
    }

    lookupWord?.let { word ->
        WordLookupDialog(word = word, onDismiss = { lookupWord = null })
    }
}

@Composable
private fun ParagraphRow(
    paragraph: String,
    textStyle: TextStyle,
    isBookmarked: Boolean,
    onToggleBookmark: () -> Unit,
    onWordTapped: (String) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 20.dp),
        verticalAlignment = Alignment.Top
    ) {
        ParagraphText(
            text = paragraph,
            onWordTapped = onWordTapped,
            style = textStyle,
            modifier = Modifier.weight(1f)
        )
        Spacer(Modifier.width(8.dp))
        IconButton(onClick = onToggleBookmark, modifier = Modifier.size(28.dp)) {
            Icon(
                if (isBookmarked) Icons.Filled.Bookmark else Icons.Filled.BookmarkBorder,
                contentDescription = if (isBookmarked) "Remove bookmark" else "Bookmark this paragraph",
                tint = textStyle.color.copy(alpha = if (isBookmarked) 1f else 0.5f)
            )
        }
    }
}

@Composable
private fun PagerBar(
    currentPage: Int,
    totalPages: Int,
    foregroundColor: Color,
    onPrevious: () -> Unit,
    onNext: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = onPrevious, enabled = currentPage > 1) {
            Icon(Icons.Filled.ChevronLeft, contentDescription = "Previous page", tint = foregroundColor)
        }
        Spacer(Modifier.weight(1f))
        Text(
            "Page $currentPage of $totalPages",
            style = MaterialTheme.typography.bodyMedium,
            color = foregroundColor.copy(alpha = 0.7f)
        )
        Spacer(Modifier.weight(1f))
        IconButton(onClick = onNext, enabled = currentPage < totalPages) {
            Icon(Icons.Filled.ChevronRight, contentDescription = "Next page", tint = foregroundColor)
        }
    }
}
