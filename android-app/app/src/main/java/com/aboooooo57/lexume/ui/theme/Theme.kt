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
    onPrimary = LexumeOnPrimaryDark,
    primaryContainer = LexumePrimaryContainerDark,
    onPrimaryContainer = LexumeOnPrimaryContainerDark,
    secondary = LexumeSecondaryDark,
    onSecondary = LexumeOnSecondaryDark,
    secondaryContainer = LexumeSecondaryContainerDark,
    onSecondaryContainer = LexumeOnSecondaryContainerDark,
    tertiary = LexumeTertiaryDark,
    onTertiary = LexumeOnTertiaryDark,
    tertiaryContainer = LexumeTertiaryContainerDark,
    onTertiaryContainer = LexumeOnTertiaryContainerDark,
    background = LexumeBackgroundDark,
    onBackground = LexumeOnBackgroundDark,
    surface = LexumeSurfaceDark,
    onSurface = LexumeOnSurfaceDark,
    surfaceVariant = LexumeSurfaceVariantDark,
    onSurfaceVariant = LexumeOnSurfaceVariantDark,
    outline = LexumeOutlineDark,
    outlineVariant = LexumeOutlineVariantDark,
    inverseSurface = LexumeInverseSurfaceDark,
    inverseOnSurface = LexumeInverseOnSurfaceDark,
    inversePrimary = LexumeInversePrimaryDark,
    surfaceTint = LexumePrimaryDark,
    error = LexumeErrorDark,
    onError = LexumeOnErrorDark,
    errorContainer = LexumeErrorContainerDark,
    onErrorContainer = LexumeOnErrorContainerDark
)

private val LightColors = lightColorScheme(
    primary = LexumePrimaryLight,
    onPrimary = LexumeOnPrimaryLight,
    primaryContainer = LexumePrimaryContainerLight,
    onPrimaryContainer = LexumeOnPrimaryContainerLight,
    secondary = LexumeSecondaryLight,
    onSecondary = LexumeOnSecondaryLight,
    secondaryContainer = LexumeSecondaryContainerLight,
    onSecondaryContainer = LexumeOnSecondaryContainerLight,
    tertiary = LexumeTertiaryLight,
    onTertiary = LexumeOnTertiaryLight,
    tertiaryContainer = LexumeTertiaryContainerLight,
    onTertiaryContainer = LexumeOnTertiaryContainerLight,
    background = LexumeBackgroundLight,
    onBackground = LexumeOnBackgroundLight,
    surface = LexumeSurfaceLight,
    onSurface = LexumeOnSurfaceLight,
    surfaceVariant = LexumeSurfaceVariantLight,
    onSurfaceVariant = LexumeOnSurfaceVariantLight,
    outline = LexumeOutlineLight,
    outlineVariant = LexumeOutlineVariantLight,
    inverseSurface = LexumeInverseSurfaceLight,
    inverseOnSurface = LexumeInverseOnSurfaceLight,
    inversePrimary = LexumeInversePrimaryLight,
    surfaceTint = LexumePrimaryLight,
    error = LexumeErrorLight,
    onError = LexumeOnErrorLight,
    errorContainer = LexumeErrorContainerLight,
    onErrorContainer = LexumeOnErrorContainerLight
)

/**
 * App-chrome theme. Distinct from the reader's own theming (system/light/
 * dark/sepia reading themes, `ReadingTheme.swift`'s analog), which is
 * scoped to the reader screen starting M5, not global app chrome.
 *
 * Dynamic color (Material You, wallpaper-derived, API 31+) defaults to
 * **off**: this app's cross-platform identity is a consistent, deliberate
 * palette matching the Mac/iPad apps, not a per-device/per-wallpaper
 * scheme - letting a random wallpaper override Lexume's own green palette
 * is exactly the kind of thing that makes the theme look "broken"/
 * inconsistent rather than intentional. Left as a parameter (not deleted)
 * in case a user-facing toggle for it is ever worth adding later.
 */
@Composable
fun LexumeTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
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
