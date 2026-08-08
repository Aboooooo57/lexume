package com.aboooooo57.lexume.ui.reader

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable

/**
 * Placeholder for tapping a word in the reader - confirms the tap-to-define
 * hit-testing itself works (see `ParagraphText.kt`) without building ahead
 * of M6, which is what actually wires this up to a real dictionary lookup
 * (`Dictionary/DictionaryView.swift`'s eventual Android counterpart).
 */
@Composable
fun WordLookupDialog(word: String, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("\"$word\"") },
        text = { Text("Dictionary lookup arrives in M6. This confirms word tap detection works.") },
        confirmButton = { TextButton(onClick = onDismiss) { Text("OK") } }
    )
}
