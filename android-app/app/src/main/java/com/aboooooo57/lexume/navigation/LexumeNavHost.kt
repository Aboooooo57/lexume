package com.aboooooo57.lexume.navigation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController

/**
 * Route names, mirroring the sidebar sections `SidebarItem` defines in
 * macOS's `LexumeApp.swift` (library / vocabulary / bookmarks), plus the
 * reader and dictionary destinations pushed on top of them. Only `Library`
 * exists as a real destination so far - the rest arrive with their own
 * milestones (M5 reader, M6 dictionary, M8 vocabulary/bookmarks).
 */
object LexumeDestinations {
    const val LIBRARY = "library"
}

@Composable
fun LexumeNavHost() {
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = LexumeDestinations.LIBRARY) {
        composable(LexumeDestinations.LIBRARY) {
            ScaffoldPlaceholder()
        }
    }
}

/**
 * M1 stand-in for the eventual Library screen (M8) - just confirms the
 * scaffold builds and renders. Replaced, not built on top of, once the real
 * screen lands.
 */
@Composable
private fun ScaffoldPlaceholder() {
    Scaffold { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("Lexume", style = MaterialTheme.typography.headlineMedium)
            Text(
                "Android build scaffold (M1) - Library, Reader, and the rest arrive in later milestones.",
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}
