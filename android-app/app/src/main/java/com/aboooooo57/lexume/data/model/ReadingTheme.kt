package com.aboooooo57.lexume.data.model

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/**
 * The reader's own background/foreground theming - independent of the app
 * chrome's Material theme (`ui/theme/Theme.kt`). Mirrors `ReadingTheme.swift`
 * exactly, including its literal sepia/dark RGB values.
 */
enum class ReadingTheme(val storageKey: String) {
    SYSTEM("system"),
    LIGHT("light"),
    DARK("dark"),
    SEPIA("sepia");

    companion object {
        fun fromStorageKey(key: String): ReadingTheme = entries.firstOrNull { it.storageKey == key } ?: SYSTEM
    }
}

@Composable
fun ReadingTheme.backgroundColor(): Color = when (this) {
    ReadingTheme.SYSTEM -> MaterialTheme.colorScheme.background
    ReadingTheme.LIGHT -> Color.White
    ReadingTheme.DARK -> Color(0xFF1C1C1F)
    ReadingTheme.SEPIA -> Color(0xFFF5EBD1)
}

@Composable
fun ReadingTheme.foregroundColor(): Color = when (this) {
    ReadingTheme.SYSTEM -> MaterialTheme.colorScheme.onBackground
    ReadingTheme.LIGHT -> Color.Black
    ReadingTheme.DARK -> Color.White
    ReadingTheme.SEPIA -> Color(0xFF4C3821)
}
