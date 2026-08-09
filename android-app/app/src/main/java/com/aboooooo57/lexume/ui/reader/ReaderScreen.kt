package com.aboooooo57.lexume.ui.reader

import androidx.compose.animation.Crossfade
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
import androidx.compose.material.icons.filled.Article
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
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
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aboooooo57.lexume.data.local.AppPreferences
import com.aboooooo57.lexume.data.local.SecureKeyStore
import com.aboooooo57.lexume.data.model.ReadingTheme
import com.aboooooo57.lexume.data.model.TargetLanguage
import com.aboooooo57.lexume.data.model.TokenMap
import com.aboooooo57.lexume.data.model.WordBox
import com.aboooooo57.lexume.data.model.backgroundColor
import com.aboooooo57.lexume.data.model.foregroundColor
import com.aboooooo57.lexume.data.repository.PageExtractionService
import com.aboooooo57.lexume.data.repository.SessionRepository
import com.aboooooo57.lexume.ui.dictionary.DictionaryDialog

/**
 * The reader screen - reflowed text (M5, Phase 1 + M6 translation + M7
 * narration) or Original Layout mode's real page image (M12), toggled per
 * session via the toolbar action below. Mirrors `Reader/ReaderView.swift`'s
 * `pageBody(vm:)` branch between `reflowedBody`/`originalLayoutBody`, plus
 * the reflowed side's per-paragraph translate row, player bar, and karaoke
 * word highlighting. Key terms aren't ported - not currently planned.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReaderScreen(
    sessionId: String,
    sessionRepository: SessionRepository,
    pageExtractionService: PageExtractionService,
    appPreferences: AppPreferences,
    secureKeyStore: SecureKeyStore,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val viewModel = remember(sessionId) {
        ReaderViewModel(
            sessionId,
            sessionRepository,
            pageExtractionService,
            appPreferences,
            secureKeyStore,
            context.applicationContext
        )
    }
    LaunchedEffect(sessionId) { viewModel.start() }
    DisposableEffect(viewModel) {
        onDispose {
            viewModel.persistPositionNow()
            viewModel.release()
        }
    }

    val readingThemeKey by appPreferences.readingTheme.collectAsState(initial = "system")
    val fontFamilyKey by appPreferences.fontFamily.collectAsState(initial = "sans")
    val fontSize by appPreferences.fontSize.collectAsState(initial = 18f)
    val targetLanguageName by appPreferences.targetLanguage.collectAsState(initial = "Persian")
    val isTargetLanguageRtl = TargetLanguage.named(targetLanguageName).isRtl
    val audioMode by appPreferences.audioMode.collectAsState(initial = "manual")

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
    // Which word box on the page is currently being defined, so
    // OriginalLayoutPageView can draw a highlight over it - only ever set
    // from a tap there (reflowed text has no boxes to highlight). Cleared
    // alongside lookupWord (dialog dismissed) and on page navigation, so a
    // stale highlight never lingers onto a page it doesn't belong to.
    var lookupHighlightBox by remember { mutableStateOf<WordBox?>(null) }
    LaunchedEffect(viewModel.currentPageNumber) { lookupHighlightBox = null }

    val activeTokenIndex = viewModel.playbackEngine.activeTokenIndex

    Scaffold(
        topBar = {
            if (!isFocusMode) {
                TopAppBar(
                    // A long original filename (imported PDFs default their
                    // session name to it) would otherwise wrap across as
                    // many lines as it takes, growing the app bar itself -
                    // one line + an ellipsis instead, same fix already
                    // applied to the page-selector's own filename subtitle.
                    title = {
                        Text(
                            viewModel.overview?.name ?: "Reading",
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    },
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                        }
                    },
                    actions = {
                        // Original Layout mode (M12) only makes sense for
                        // sessions with a real page image to show - pasted
                        // text has nothing to render, so the toggle stays
                        // hidden there rather than switching to an empty view.
                        val sourceType = viewModel.overview?.sourceType
                        if (sourceType == "pdf" || sourceType == "image") {
                            IconButton(onClick = { viewModel.setOriginalLayoutMode(!viewModel.isOriginalLayoutMode, scope) }) {
                                Icon(
                                    if (viewModel.isOriginalLayoutMode) Icons.Filled.Article else Icons.Filled.Image,
                                    contentDescription = if (viewModel.isOriginalLayoutMode) "Switch to reflowed text" else "Switch to original page layout"
                                )
                            }
                        }
                        IconButton(onClick = { isFocusMode = true }) {
                            Icon(Icons.Filled.Fullscreen, contentDescription = "Enter Focus Mode")
                        }
                    }
                )
            }
        },
        bottomBar = {
            // The player bar stays visible even in Focus Mode (you'd still
            // want to control narration while reading distraction-free) -
            // only the pager hides, mirroring ReaderView.swift's own
            // structure exactly.
            Column {
                if (audioMode != "off") {
                    PlayerBarView(
                        hasAudio = viewModel.hasAudio,
                        isGeneratingAudio = viewModel.isGeneratingAudio,
                        audioError = viewModel.audioError,
                        playbackEngine = viewModel.playbackEngine,
                        onGenerateAudio = { viewModel.requestGenerateAudio(scope) }
                    )
                }
                if (!isFocusMode) {
                    PagerBar(
                        currentPage = viewModel.currentPageNumber,
                        totalPages = viewModel.overview?.totalPages ?: 1,
                        foregroundColor = foregroundColor,
                        onPrevious = { viewModel.goToPage(viewModel.currentPageNumber - 1, scope) },
                        onNext = { viewModel.goToPage(viewModel.currentPageNumber + 1, scope) }
                    )
                }
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
                viewModel.isOriginalLayoutMode && viewModel.isLoadingOriginalLayout && viewModel.originalLayoutImage == null -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }
                viewModel.isOriginalLayoutMode && viewModel.originalLayoutError != null -> {
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
                        Text(viewModel.originalLayoutError ?: "", color = foregroundColor, textAlign = TextAlign.Center)
                        Spacer(Modifier.height(12.dp))
                        Button(onClick = { viewModel.retryOriginalLayout(scope) }) { Text("Retry") }
                    }
                }
                viewModel.isOriginalLayoutMode && viewModel.originalLayoutImage != null -> {
                    OriginalLayoutPageView(
                        image = viewModel.originalLayoutImage!!,
                        wordBoxes = viewModel.originalLayoutWordBoxes,
                        onWordTapped = { box ->
                            lookupWord = box.word
                            lookupHighlightBox = box
                        },
                        highlightedBox = lookupHighlightBox,
                        modifier = Modifier.fillMaxSize()
                    )
                }
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
                    // Crossfade keyed on the page number, not the page
                    // content itself - a soft fade between pages instead of
                    // an instant cut when the arrow buttons change pages.
                    // Other state changes for the *same* page (e.g. a
                    // translation finishing) recompose in place with no
                    // transition, since the key hasn't changed.
                    Crossfade(targetState = viewModel.currentPageNumber, label = "reader-page") {
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
                            itemsIndexed(viewModel.paragraphs) { index, paragraph ->
                                val karaoke = karaokeState(index, viewModel.paragraphs, viewModel.tokenMap, activeTokenIndex)
                                ParagraphRow(
                                    index = index,
                                    paragraph = paragraph,
                                    textStyle = textStyle,
                                    isBookmarked = viewModel.isBookmarked(paragraph),
                                    isTranslating = viewModel.translatingParagraphIndices.contains(index),
                                    translation = viewModel.paragraphTranslations[index],
                                    translationError = viewModel.paragraphTranslationErrors[index],
                                    isTargetLanguageRtl = isTargetLanguageRtl,
                                    activeRange = karaoke.activeRange,
                                    spokenEndOffset = karaoke.spokenEndOffset,
                                    onToggleBookmark = { viewModel.toggleBookmark(paragraph, scope) },
                                    onTranslate = { viewModel.requestParagraphTranslation(index, paragraph, scope) },
                                    onWordTapped = { lookupWord = it }
                                )
                            }
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
        DictionaryDialog(
            initialWord = word,
            sessionId = sessionId,
            sessionRepository = sessionRepository,
            appPreferences = appPreferences,
            secureKeyStore = secureKeyStore,
            onDismiss = {
                lookupWord = null
                lookupHighlightBox = null
            }
        )
    }

    viewModel.pendingAudioConfirmationCharCount?.let { charCount ->
        AlertDialog(
            onDismissRequest = { viewModel.cancelPendingAudioGeneration() },
            title = { Text("Generate narration for this page?") },
            text = {
                Text(
                    "This page is $charCount characters — about ${estimatedNarrationCost(charCount)} " +
                        "with ElevenLabs. Continue?"
                )
            },
            confirmButton = {
                TextButton(onClick = { viewModel.confirmPendingAudioGeneration(scope) }) {
                    Text("Generate Audio")
                }
            },
            dismissButton = {
                Row {
                    TextButton(onClick = { viewModel.confirmPendingAudioGenerationDontAskAgain(scope) }) {
                        Text("Don't Ask Again")
                    }
                    TextButton(onClick = { viewModel.cancelPendingAudioGeneration() }) {
                        Text("Cancel")
                    }
                }
            }
        )
    }
}

/** Per-paragraph karaoke state derived from the page's single global [TokenMap] + the currently active token index. Mirrors `ReaderView.swift`'s own `karaokeState(for:vm:)`. */
private data class KaraokeState(val activeRange: IntRange?, val spokenEndOffset: Int?)

private fun karaokeState(
    paragraphIndex: Int,
    paragraphs: List<String>,
    tokenMap: TokenMap?,
    activeTokenIndex: Int?
): KaraokeState {
    if (tokenMap == null || activeTokenIndex == null || activeTokenIndex >= tokenMap.tokens.size) {
        return KaraokeState(null, null)
    }
    val activeToken = tokenMap.tokens[activeTokenIndex]
    return when {
        paragraphIndex < activeToken.paragraphIndex -> {
            if (paragraphIndex >= paragraphs.size) KaraokeState(null, null)
            else KaraokeState(null, paragraphs[paragraphIndex].length)
        }
        paragraphIndex == activeToken.paragraphIndex ->
            KaraokeState(activeToken.rangeInParagraph, activeToken.rangeInParagraph.first)
        else -> KaraokeState(null, null)
    }
}

private fun estimatedNarrationCost(charCount: Int): String =
    "$%.2f".format(charCount / 1000.0 * 0.12)

@Composable
private fun ParagraphRow(
    index: Int,
    paragraph: String,
    textStyle: TextStyle,
    isBookmarked: Boolean,
    isTranslating: Boolean,
    translation: String?,
    translationError: String?,
    isTargetLanguageRtl: Boolean,
    activeRange: IntRange?,
    spokenEndOffset: Int?,
    onToggleBookmark: () -> Unit,
    onTranslate: () -> Unit,
    onWordTapped: (String) -> Unit
) {
    val haptic = LocalHapticFeedback.current
    Column(modifier = Modifier.padding(bottom = 20.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.Top
        ) {
            ParagraphText(
                text = paragraph,
                onWordTapped = onWordTapped,
                style = textStyle,
                activeRange = activeRange,
                spokenEndOffset = spokenEndOffset,
                modifier = Modifier.weight(1f)
            )
            Spacer(Modifier.width(8.dp))
            Column {
                IconButton(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        onToggleBookmark()
                    },
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        if (isBookmarked) Icons.Filled.Bookmark else Icons.Filled.BookmarkBorder,
                        contentDescription = if (isBookmarked) "Remove bookmark" else "Bookmark this paragraph",
                        tint = textStyle.color.copy(alpha = if (isBookmarked) 1f else 0.5f)
                    )
                }
                IconButton(
                    onClick = onTranslate,
                    enabled = !isTranslating && translation == null,
                    modifier = Modifier.size(28.dp)
                ) {
                    if (isTranslating) {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp))
                    } else {
                        Icon(
                            Icons.Filled.Language,
                            contentDescription = "Translate this paragraph",
                            tint = textStyle.color.copy(alpha = 0.5f)
                        )
                    }
                }
            }
        }
        if (translation != null) {
            Text(
                translation,
                // textDirection is set explicitly from the target language,
                // not left to Compose's default content-sniffing
                // (TextDirection.ContentOrLtr, which only looks at the
                // first strong-directional character) - a Persian/Arabic
                // translation that happens to start with a digit, a Latin
                // proper noun, or punctuation would otherwise get
                // misjudged as LTR even though the language itself is RTL.
                style = textStyle.copy(
                    color = textStyle.color.copy(alpha = 0.85f),
                    textDirection = if (isTargetLanguageRtl) TextDirection.Rtl else TextDirection.Ltr
                ),
                textAlign = if (isTargetLanguageRtl) TextAlign.End else TextAlign.Start,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 6.dp, start = if (isTargetLanguageRtl) 0.dp else 10.dp, end = if (isTargetLanguageRtl) 10.dp else 0.dp)
            )
        } else if (translationError != null) {
            Text(
                translationError,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(top = 4.dp)
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
    val haptic = LocalHapticFeedback.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(
            onClick = {
                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                onPrevious()
            },
            enabled = currentPage > 1
        ) {
            Icon(Icons.Filled.ChevronLeft, contentDescription = "Previous page", tint = foregroundColor)
        }
        Spacer(Modifier.weight(1f))
        Text(
            "Page $currentPage of $totalPages",
            style = MaterialTheme.typography.bodyMedium,
            color = foregroundColor.copy(alpha = 0.7f)
        )
        Spacer(Modifier.weight(1f))
        IconButton(
            onClick = {
                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                onNext()
            },
            enabled = currentPage < totalPages
        ) {
            Icon(Icons.Filled.ChevronRight, contentDescription = "Next page", tint = foregroundColor)
        }
    }
}
