package com.aboooooo57.lexume.ui.settings

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.TextFields
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import com.aboooooo57.lexume.data.local.AppPreferences
import com.aboooooo57.lexume.data.local.SecureKeyStore
import com.aboooooo57.lexume.data.repository.SessionRepository
import com.aboooooo57.lexume.network.DriveSyncService

/**
 * Mirrors `Settings/SettingsView.swift`'s `TabView` - API Keys, Models &
 * Voice, Reading, General, Backup (M9). Reached via the gearshape icon on
 * the Library tab's top bar (no menu bar on Android, same reasoning as the
 * iPad port's Settings sheet entry point).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    secureKeyStore: SecureKeyStore,
    appPreferences: AppPreferences,
    sessionRepository: SessionRepository,
    driveSyncService: DriveSyncService,
    onBack: () -> Unit,
    onReplayOnboarding: () -> Unit,
    onReplayGuidedTour: () -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs: List<Pair<String, ImageVector>> = listOf(
        "API Keys" to Icons.Filled.Key,
        "Models & Voice" to Icons.Filled.GraphicEq,
        "Reading" to Icons.Filled.TextFields,
        "General" to Icons.Filled.Settings,
        "Backup" to Icons.Filled.CloudUpload
    )
    // Shared across tabs (ApiKeysTab/GeneralTab) for brief confirmations
    // ("Saved.", "Cache cleared.") - a transient Snackbar reads better than
    // a status line that permanently occupies layout space until the next
    // action overwrites it.
    val snackbarHostState = remember { SnackbarHostState() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            TabRow(selectedTabIndex = selectedTab) {
                tabs.forEachIndexed { index, (label, icon) ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = { Text(label, style = MaterialTheme.typography.labelSmall) },
                        icon = { Icon(icon, contentDescription = label) }
                    )
                }
            }
            when (selectedTab) {
                0 -> ApiKeysTab(secureKeyStore = secureKeyStore, snackbarHostState = snackbarHostState)
                1 -> ModelsVoiceTab(appPreferences = appPreferences, secureKeyStore = secureKeyStore)
                2 -> ReadingTab(appPreferences = appPreferences)
                3 -> GeneralTab(
                    appPreferences = appPreferences,
                    sessionRepository = sessionRepository,
                    onReplayOnboarding = onReplayOnboarding,
                    onReplayGuidedTour = onReplayGuidedTour,
                    snackbarHostState = snackbarHostState
                )
                4 -> BackupTab(driveSyncService = driveSyncService)
            }
        }
    }
}
