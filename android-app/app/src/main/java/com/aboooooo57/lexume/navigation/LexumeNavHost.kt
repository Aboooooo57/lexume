package com.aboooooo57.lexume.navigation

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContentPaste
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.UploadFile
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.aboooooo57.lexume.LexumeApplication
import com.aboooooo57.lexume.ui.library.ImportCoordinator
import com.aboooooo57.lexume.ui.library.ImportProgressDialog
import com.aboooooo57.lexume.ui.library.ImportStage
import com.aboooooo57.lexume.ui.library.PasteTextDialog
import com.aboooooo57.lexume.ui.library.PdfPageSelectorScreen
import com.aboooooo57.lexume.ui.reader.ReaderScreen
import com.aboooooo57.lexume.ui.settings.OnboardingScreen
import com.aboooooo57.lexume.ui.settings.SettingsScreen
import kotlinx.coroutines.flow.first

/**
 * Route names, mirroring the sidebar sections `SidebarItem` defines in
 * macOS's `LexumeApp.swift` (library / vocabulary / bookmarks), plus the
 * reader and dictionary destinations pushed on top of them. Onboarding and
 * Settings (M3) are reached by pushing on top of Library the same way
 * `OnboardingSheet`/`SettingsView` are presented as sheets on macOS/iPad -
 * there's no menu bar or window chrome to hang them off of here. Reader
 * (M5) takes a session ID, same as macOS/iPad's own `navigationDestination(for: PersistentIdentifier.self)`.
 * Dictionary/Vocabulary/Bookmarks arrive in M6/M8.
 */
object LexumeDestinations {
    const val LIBRARY = "library"
    const val ONBOARDING = "onboarding"
    const val SETTINGS = "settings"
    const val READER_ROUTE = "reader/{sessionId}"
    fun reader(sessionId: String) = "reader/$sessionId"
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LexumeNavHost() {
    val context = LocalContext.current
    val app = context.applicationContext as LexumeApplication
    val navController = rememberNavController()

    // First-launch check, mirroring `RootView`'s own `.onAppear` logic on
    // macOS/iPad: show onboarding automatically unless it's already been
    // dismissed. Runs once per fresh composition of the nav host (app
    // process start), not on every screen change.
    LaunchedEffect(Unit) {
        val dismissed = app.appPreferences.hasDismissedOnboarding.first()
        if (!dismissed) {
            navController.navigate(LexumeDestinations.ONBOARDING)
        }
    }

    NavHost(navController = navController, startDestination = LexumeDestinations.LIBRARY) {
        composable(LexumeDestinations.LIBRARY) {
            ScaffoldPlaceholder(
                onOpenSettings = { navController.navigate(LexumeDestinations.SETTINGS) },
                onOpenReader = { sessionId -> navController.navigate(LexumeDestinations.reader(sessionId)) }
            )
        }
        composable(LexumeDestinations.ONBOARDING) {
            OnboardingScreen(
                secureKeyStore = app.secureKeyStore,
                appPreferences = app.appPreferences,
                onDone = { navController.popBackStack() }
            )
        }
        composable(LexumeDestinations.SETTINGS) {
            SettingsScreen(
                secureKeyStore = app.secureKeyStore,
                appPreferences = app.appPreferences,
                sessionRepository = app.sessionRepository,
                onBack = { navController.popBackStack() },
                onReplayOnboarding = { navController.navigate(LexumeDestinations.ONBOARDING) }
            )
        }
        composable(LexumeDestinations.READER_ROUTE) { backStackEntry ->
            val sessionId = backStackEntry.arguments?.getString("sessionId")
            if (sessionId != null) {
                ReaderScreen(
                    sessionId = sessionId,
                    sessionRepository = app.sessionRepository,
                    pageExtractionService = app.pageExtractionService,
                    appPreferences = app.appPreferences,
                    secureKeyStore = app.secureKeyStore,
                    onBack = { navController.popBackStack() }
                )
            }
        }
    }
}

/**
 * M1 stand-in for the eventual Library screen (M8) - confirms the scaffold
 * builds and renders, and (M4) hosts the whole import flow, since there's
 * nowhere else for "Add a book" to live until the real Library exists.
 * Replaced, not built on top of, once M8 lands. The gear icon is Settings'
 * only entry point on Android, same reasoning as the iPad port's own
 * sidebar-toolbar gearshape; the two new import icons mirror
 * `LibraryView.swift`'s toolbar ("Paste Text", "Open File…").
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ScaffoldPlaceholder(onOpenSettings: () -> Unit, onOpenReader: (String) -> Unit) {
    val context = LocalContext.current
    val app = context.applicationContext as LexumeApplication
    val scope = rememberCoroutineScope()

    val coordinator = remember {
        ImportCoordinator(
            context = context.applicationContext,
            sessionRepository = app.sessionRepository,
            pdfPageExtractor = app.pdfPageExtractor,
            pageExtractionService = app.pageExtractionService,
            appPreferences = app.appPreferences
        )
    }
    var isPasteDialogShown by remember { mutableStateOf(false) }

    val openFileLauncher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) coordinator.handlePickedFile(uri, scope)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Lexume") },
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
                .padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                "Android build scaffold (M1–M5) - a real Library arrives in M8. Use Paste Text or Open File above to import a session, then Read Now to open it.",
                style = MaterialTheme.typography.bodyMedium
            )
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
                onSelectionChange = { coordinator.setSelectedIndices(it) },
                onConfirm = { coordinator.confirmPageSelection(scope) },
                onCancel = { coordinator.cancelSelection() },
                pdfPageExtractor = app.pdfPageExtractor
            )
        }
    } else {
        ImportProgressDialog(
            stage = stage,
            onDismiss = { coordinator.dismiss() },
            onReadNow = { sessionId ->
                coordinator.dismiss()
                onOpenReader(sessionId)
            }
        )
    }
}

/** SAF filter for `ActivityResultContracts.OpenDocument()` - mirrors `LibraryView.swift`'s `fileImporter` content types. */
private val IMPORT_MIME_TYPES = arrayOf(
    "application/pdf",
    "text/plain",
    "text/markdown",
    "image/jpeg",
    "image/png",
    "image/heic",
    "image/heif"
)
