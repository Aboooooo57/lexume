package com.aboooooo57.lexume.ui.home

import androidx.compose.animation.Crossfade
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import com.aboooooo57.lexume.data.local.AppPreferences
import com.aboooooo57.lexume.data.repository.PageExtractionService
import com.aboooooo57.lexume.data.repository.SessionRepository
import com.aboooooo57.lexume.network.NetworkMonitor
import com.aboooooo57.lexume.pdf.PdfPageExtractor
import com.aboooooo57.lexume.ui.bookmarks.BookmarksScreen
import com.aboooooo57.lexume.ui.library.LibraryScreen
import com.aboooooo57.lexume.ui.vocabulary.VocabularyScreen

private enum class HomeTab(val label: String) {
    LIBRARY("Library"),
    VOCABULARY("Vocabulary"),
    BOOKMARKS("Bookmarks")
}

/**
 * Bottom navigation across Library/Vocabulary/Bookmarks - the Android analog
 * of the Mac/iPad sidebar's `SidebarItem`s (`LexumeApp.swift`). Each tab
 * hosts a full screen (its own `TopAppBar`); nested `Scaffold`s are fine
 * here since only this outer one owns the bottom bar. Also hosts the
 * offline banner (M11), same placement as `RootView`'s own - above
 * whichever tab is showing, not per-tab.
 */
@Composable
fun HomeScreen(
    sessionRepository: SessionRepository,
    pdfPageExtractor: PdfPageExtractor,
    pageExtractionService: PageExtractionService,
    appPreferences: AppPreferences,
    networkMonitor: NetworkMonitor,
    onOpenSession: (String) -> Unit,
    onOpenSettings: () -> Unit
) {
    var selectedTab by remember { mutableStateOf(HomeTab.LIBRARY) }
    val haptic = LocalHapticFeedback.current

    fun select(tab: HomeTab) {
        if (tab != selectedTab) {
            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
            selectedTab = tab
        }
    }

    Scaffold(
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = selectedTab == HomeTab.LIBRARY,
                    onClick = { select(HomeTab.LIBRARY) },
                    icon = { Icon(Icons.Filled.Home, contentDescription = null) },
                    label = { Text(HomeTab.LIBRARY.label) }
                )
                NavigationBarItem(
                    selected = selectedTab == HomeTab.VOCABULARY,
                    onClick = { select(HomeTab.VOCABULARY) },
                    icon = { Icon(Icons.Filled.MenuBook, contentDescription = null) },
                    label = { Text(HomeTab.VOCABULARY.label) }
                )
                NavigationBarItem(
                    selected = selectedTab == HomeTab.BOOKMARKS,
                    onClick = { select(HomeTab.BOOKMARKS) },
                    icon = { Icon(Icons.Filled.Bookmark, contentDescription = null) },
                    label = { Text(HomeTab.BOOKMARKS.label) }
                )
            }
        }
    ) { innerPadding ->
        // Each tab hosts its own Scaffold (its own TopAppBar + fillMaxSize
        // content), so the outer Scaffold's innerPadding - which reserves
        // room for the bottom bar - has to be applied to that whole tab
        // here, not left for the tab to discover on its own.
        Column(modifier = Modifier.fillMaxSize().padding(innerPadding)) {
            if (!networkMonitor.isOnline) {
                OfflineBanner()
            }
            Crossfade(
                targetState = selectedTab,
                modifier = Modifier.weight(1f).fillMaxWidth(),
                label = "home-tab"
            ) { tab ->
                when (tab) {
                    HomeTab.LIBRARY -> LibraryScreen(
                        sessionRepository = sessionRepository,
                        pdfPageExtractor = pdfPageExtractor,
                        pageExtractionService = pageExtractionService,
                        appPreferences = appPreferences,
                        onOpenSession = onOpenSession,
                        onOpenSettings = onOpenSettings
                    )
                    HomeTab.VOCABULARY -> VocabularyScreen(
                        sessionRepository = sessionRepository,
                        onOpenSession = onOpenSession
                    )
                    HomeTab.BOOKMARKS -> BookmarksScreen(
                        sessionRepository = sessionRepository,
                        onOpenSession = onOpenSession
                    )
                }
            }
        }
    }
}

/** Mirrors `LexumeApp.swift`'s `offlineBanner`. */
@Composable
private fun OfflineBanner() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFFFFC107).copy(alpha = 0.15f))
            .padding(vertical = 6.dp, horizontal = 12.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            Icons.Filled.WifiOff,
            contentDescription = null,
            modifier = Modifier.size(14.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(Modifier.width(6.dp))
        Text(
            "You're offline — cached sessions are still readable, but importing, narration, " +
                "and lookups need a connection.",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
