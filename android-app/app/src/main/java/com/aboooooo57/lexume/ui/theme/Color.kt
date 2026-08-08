package com.aboooooo57.lexume.ui.theme

import androidx.compose.ui.graphics.Color

// A complete, coherent Material 3 tonal palette - not the app's final brand
// colors (that's a real design pass, deferred to M11), but every commonly-
// touched ColorScheme slot is deliberately set here rather than left at
// Material3's own default baseline. Leaving slots like `primaryContainer`/
// `tertiary` unset (as M1 originally did, only specifying `primary`/
// `secondary`) doesn't make them "inherit" the custom primary - Compose
// Material3's lightColorScheme()/darkColorScheme() factories give every
// unset slot its own independent literal default (Google's baseline
// purple/lavender palette), so half-filled schemes visibly clash: a green
// primary button next to a purple-default primary container, etc. Reading-
// app-appropriate hues: forest green (primary, matches the existing choice),
// sage (secondary), warm gold (tertiary, evokes a highlight/bookmark
// accent), a faintly green-tinted neutral (background/surface/outline)
// rather than Material's default faintly-purple neutral.

// Primary - forest green
val LexumePrimaryLight = Color(0xFF2E5A45)
val LexumeOnPrimaryLight = Color(0xFFFFFFFF)
val LexumePrimaryContainerLight = Color(0xFFB9F0C9)
val LexumeOnPrimaryContainerLight = Color(0xFF00210F)

val LexumePrimaryDark = Color(0xFF9AD2B5)
val LexumeOnPrimaryDark = Color(0xFF00391F)
val LexumePrimaryContainerDark = Color(0xFF154D34)
val LexumeOnPrimaryContainerDark = Color(0xFFB9F0C9)

// Secondary - muted sage
val LexumeSecondaryLight = Color(0xFF4C6358)
val LexumeOnSecondaryLight = Color(0xFFFFFFFF)
val LexumeSecondaryContainerLight = Color(0xFFCEE9D9)
val LexumeOnSecondaryContainerLight = Color(0xFF092016)

val LexumeSecondaryDark = Color(0xFFB2CCC0)
val LexumeOnSecondaryDark = Color(0xFF1F352B)
val LexumeSecondaryContainerDark = Color(0xFF354B40)
val LexumeOnSecondaryContainerDark = Color(0xFFCEE9D9)

// Tertiary - warm gold (bookmark/highlight accent)
val LexumeTertiaryLight = Color(0xFF725C0B)
val LexumeOnTertiaryLight = Color(0xFFFFFFFF)
val LexumeTertiaryContainerLight = Color(0xFFFFE08A)
val LexumeOnTertiaryContainerLight = Color(0xFF231B00)

val LexumeTertiaryDark = Color(0xFFE0C46E)
val LexumeOnTertiaryDark = Color(0xFF3B2F00)
val LexumeTertiaryContainerDark = Color(0xFF544500)
val LexumeOnTertiaryContainerDark = Color(0xFFFFE08A)

// Neutral - faintly green-tinted rather than Material's default purple-gray
val LexumeBackgroundLight = Color(0xFFFBFDF8)
val LexumeOnBackgroundLight = Color(0xFF191D1A)
val LexumeSurfaceLight = Color(0xFFFBFDF8)
val LexumeOnSurfaceLight = Color(0xFF191D1A)
val LexumeSurfaceVariantLight = Color(0xFFDDE5DD)
val LexumeOnSurfaceVariantLight = Color(0xFF414942)
val LexumeOutlineLight = Color(0xFF717971)
val LexumeOutlineVariantLight = Color(0xFFC1C9C0)

val LexumeBackgroundDark = Color(0xFF111411)
val LexumeOnBackgroundDark = Color(0xFFE1E3DE)
val LexumeSurfaceDark = Color(0xFF111411)
val LexumeOnSurfaceDark = Color(0xFFE1E3DE)
val LexumeSurfaceVariantDark = Color(0xFF414942)
val LexumeOnSurfaceVariantDark = Color(0xFFC1C9C0)
val LexumeOutlineDark = Color(0xFF8B938A)
val LexumeOutlineVariantDark = Color(0xFF414942)

// Inverse + surface tint
val LexumeInverseSurfaceLight = Color(0xFF2D322D)
val LexumeInverseOnSurfaceLight = Color(0xFFEFF2EB)
val LexumeInversePrimaryLight = Color(0xFF9AD2B5)

val LexumeInverseSurfaceDark = Color(0xFFE1E3DE)
val LexumeInverseOnSurfaceDark = Color(0xFF2D322D)
val LexumeInversePrimaryDark = Color(0xFF2E5A45)

// Error - Material 3's own standard tokens, spelled out explicitly (not
// brand-specific; red error semantics shouldn't be reskinned).
val LexumeErrorLight = Color(0xFFBA1A1A)
val LexumeOnErrorLight = Color(0xFFFFFFFF)
val LexumeErrorContainerLight = Color(0xFFFFDAD6)
val LexumeOnErrorContainerLight = Color(0xFF410002)

val LexumeErrorDark = Color(0xFFFFB4AB)
val LexumeOnErrorDark = Color(0xFF690005)
val LexumeErrorContainerDark = Color(0xFF93000A)
val LexumeOnErrorContainerDark = Color(0xFFFFDAD6)
