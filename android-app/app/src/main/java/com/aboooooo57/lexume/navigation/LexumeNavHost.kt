package com.aboooooo57.lexume.navigation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.aboooooo57.lexume.LexumeApplication
import com.aboooooo57.lexume.ui.settings.OnboardingScreen
import com.aboooooo57.lexume.ui.settings.SettingsScreen
import kotlinx.coroutines.flow.first

/**
 * Route names, mirroring the sidebar sections `SidebarItem` defines in
 * macOS's `LexumeApp.swift` (library / vocabulary / bookmarks), plus the
 * reader and dictionary destinations pushed on top of them. Only `Library`
 * exists as a real destination so far - the rest arrive with their own
 * milestones (M5 reader, M6 dictionary, M8 vocabulary/bookmarks). Onboarding
 * and Settings (M3) are reached by pushing on top of Library the same way
 * `OnboardingSheet`/`SettingsView` are presented as sheets on macOS/iPad -
 * there's no menu bar or window chrome to hang them off of here.
 */
object LexumeDestinations {
    const val LIBRARY = "library"
    const val ONBOARDING = "onboarding"
    const val SETTINGS = "settings"
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
            ScaffoldPlaceholder(onOpenSettings = { navController.navigate(LexumeDestinations.SETTINGS) })
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
    }
}

/**
 * M1 stand-in for the eventual Library screen (M8) - just confirms the
 * scaffold builds and renders. Replaced, not built on top of, once the real
 * screen lands. The gear icon is Settings' only entry point on Android, same
 * reasoning as the iPad port's own sidebar-toolbar gearshape.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ScaffoldPlaceholder(onOpenSettings: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Lexume") },
                actions = {
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
                "Android build scaffold (M1–M3) - Library, Reader, and the rest arrive in later milestones.",
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}
