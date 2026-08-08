package com.aboooooo57.lexume.navigation

import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.aboooooo57.lexume.LexumeApplication
import com.aboooooo57.lexume.ui.home.HomeScreen
import com.aboooooo57.lexume.ui.reader.ReaderScreen
import com.aboooooo57.lexume.ui.settings.GuidedTourScreen
import com.aboooooo57.lexume.ui.settings.OnboardingScreen
import com.aboooooo57.lexume.ui.settings.SettingsScreen
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/**
 * Route names, mirroring the sidebar sections `SidebarItem` defines in
 * macOS's `LexumeApp.swift` (library / vocabulary / bookmarks - all three
 * now live together in [HomeScreen]'s bottom nav, M8), plus the reader and
 * dictionary destinations pushed on top of them. Onboarding, the guided
 * tour (M11), and Settings (M3) are reached by pushing on top of Home the
 * same way `OnboardingSheet`/`GuidedTourSheet`/`SettingsView` are presented
 * as sheets on macOS/iPad - there's no menu bar or window chrome to hang
 * them off of here. Reader (M5) takes a session ID, same as macOS/iPad's
 * own `navigationDestination(for: PersistentIdentifier.self)`.
 */
object LexumeDestinations {
    const val LIBRARY = "library"
    const val ONBOARDING = "onboarding"
    const val GUIDED_TOUR = "guided_tour"
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
    val scope = rememberCoroutineScope()

    // First-launch check, mirroring `RootView`'s own `.onAppear` logic on
    // macOS/iPad: show onboarding automatically unless it's already been
    // dismissed; if onboarding was already dismissed in an earlier session
    // but the guided tour hasn't been seen yet (e.g. this build added the
    // tour after that user's first run), show the tour directly instead.
    // Runs once per fresh composition of the nav host (app process start),
    // not on every screen change.
    LaunchedEffect(Unit) {
        val dismissedOnboarding = app.appPreferences.hasDismissedOnboarding.first()
        if (!dismissedOnboarding) {
            navController.navigate(LexumeDestinations.ONBOARDING)
        } else if (!app.appPreferences.hasSeenGuidedTour.first()) {
            navController.navigate(LexumeDestinations.GUIDED_TOUR)
        }
    }

    NavHost(navController = navController, startDestination = LexumeDestinations.LIBRARY) {
        composable(LexumeDestinations.LIBRARY) {
            HomeScreen(
                sessionRepository = app.sessionRepository,
                pdfPageExtractor = app.pdfPageExtractor,
                pageExtractionService = app.pageExtractionService,
                appPreferences = app.appPreferences,
                networkMonitor = app.networkMonitor,
                onOpenSession = { sessionId -> navController.navigate(LexumeDestinations.reader(sessionId)) },
                onOpenSettings = { navController.navigate(LexumeDestinations.SETTINGS) }
            )
        }
        composable(LexumeDestinations.ONBOARDING) {
            OnboardingScreen(
                secureKeyStore = app.secureKeyStore,
                appPreferences = app.appPreferences,
                onDone = {
                    // The tour is about how to use features, independent of
                    // whether keys were entered - show it right after key
                    // setup finishes (Skip or Save & Start both count) if it
                    // hasn't been seen yet, replacing Onboarding on the back
                    // stack rather than popping then re-pushing (no flash of
                    // Library in between).
                    scope.launch {
                        if (app.appPreferences.hasSeenGuidedTour.first()) {
                            navController.popBackStack()
                        } else {
                            navController.navigate(LexumeDestinations.GUIDED_TOUR) {
                                popUpTo(LexumeDestinations.ONBOARDING) { inclusive = true }
                            }
                        }
                    }
                }
            )
        }
        composable(LexumeDestinations.GUIDED_TOUR) {
            GuidedTourScreen(
                onDone = {
                    scope.launch { app.appPreferences.setHasSeenGuidedTour(true) }
                    navController.popBackStack()
                }
            )
        }
        composable(LexumeDestinations.SETTINGS) {
            SettingsScreen(
                secureKeyStore = app.secureKeyStore,
                appPreferences = app.appPreferences,
                sessionRepository = app.sessionRepository,
                driveSyncService = app.driveSyncService,
                onBack = { navController.popBackStack() },
                onReplayOnboarding = { navController.navigate(LexumeDestinations.ONBOARDING) },
                // A manual reopen from Settings always shows it, regardless
                // of hasSeenGuidedTour - mirrors RootView's own
                // showGuidedTour notification handler.
                onReplayGuidedTour = { navController.navigate(LexumeDestinations.GUIDED_TOUR) }
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
