package com.aboooooo57.lexume.ui.home

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.aboooooo57.lexume.data.local.AppPreferences
import com.aboooooo57.lexume.data.repository.PageExtractionService
import com.aboooooo57.lexume.data.repository.SessionRepository
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
 * here since only this outer one owns the bottom bar.
 */
@Composable
fun HomeScreen(
    sessionRepository: SessionRepository,
    pdfPageExtractor: PdfPageExtractor,
    pageExtractionService: PageExtractionService,
    appPreferences: AppPreferences,
    onOpenSession: (String) -> Unit,
    onOpenSettings: () -> Unit
) {
    var selectedTab by remember { mutableStateOf(HomeTab.LIBRARY) }

    Scaffold(
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = selectedTab == HomeTab.LIBRARY,
                    onClick = { selectedTab = HomeTab.LIBRARY },
                    icon = { Icon(Icons.Filled.Home, contentDescription = null) },
                    label = { Text(HomeTab.LIBRARY.label) }
                )
                NavigationBarItem(
                    selected = selectedTab == HomeTab.VOCABULARY,
                    onClick = { selectedTab = HomeTab.VOCABULARY },
                    icon = { Icon(Icons.Filled.MenuBook, contentDescription = null) },
                    label = { Text(HomeTab.VOCABULARY.label) }
                )
                NavigationBarItem(
                    selected = selectedTab == HomeTab.BOOKMARKS,
                    onClick = { selectedTab = HomeTab.BOOKMARKS },
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
        Box(modifier = Modifier.fillMaxSize().padding(innerPadding)) {
            when (selectedTab) {
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
