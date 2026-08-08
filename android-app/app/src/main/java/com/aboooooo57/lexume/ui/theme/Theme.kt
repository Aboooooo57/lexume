package com.aboooooo57.lexume.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

private val DarkColors = darkColorScheme(
    primary = LexumePrimaryDark,
    secondary = LexumeSecondaryDark
)

private val LightColors = lightColorScheme(
    primary = LexumePrimaryLight,
    secondary = LexumeSecondaryLight
)

/**
 * App-chrome theme (Material You dynamic color on API 31+, falls back to the
 * static Lexume palette otherwise). Distinct from the reader's own theming
 * (system/light/dark/sepia reading themes, `ReadingTheme.swift`'s analog),
 * which is scoped to the reader screen starting M5, not global app chrome.
 */
@Composable
fun LexumeTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColors
        else -> LightColors
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = LexumeTypography,
        content = content
    )
}
