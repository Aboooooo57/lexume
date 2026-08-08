package com.aboooooo57.lexume.ui.library

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * Shows import/extraction progress, and the outcome of the M4 "extract page
 * 1 as a smoke test" step ([ImportCoordinator]'s doc comment explains why
 * that step exists). There's no reader (M5) to hand off to yet, so this
 * dialog is the only place that confirms an import actually worked.
 * [ImportStage.Idle]/[ImportStage.SelectingPages] render nothing here - the
 * caller handles those (SelectingPages opens [PdfPageSelectorScreen]).
 */
@Composable
fun ImportProgressDialog(stage: ImportStage, onDismiss: () -> Unit) {
    when (stage) {
        is ImportStage.Creating -> ProgressDialog("Creating session…")
        is ImportStage.Extracting -> ProgressDialog("Extracting \"${stage.sessionName}\"…")
        is ImportStage.Result -> AlertDialog(
            onDismissRequest = onDismiss,
            title = { Text(if (stage.error == null) "Imported" else "Imported, but…") },
            text = {
                Text(
                    if (stage.error == null) {
                        "\"${stage.sessionName}\" was created and its first page extracted " +
                            "successfully (title: \"${stage.extractedTitle}\"). The reader " +
                            "(M5) will pick up from here."
                    } else {
                        "\"${stage.sessionName}\" was created, but extracting its first page " +
                            "failed: ${stage.error}. You can retry once the reader (M5) exists."
                    }
                )
            },
            confirmButton = { TextButton(onClick = onDismiss) { Text("OK") } }
        )
        is ImportStage.Error -> AlertDialog(
            onDismissRequest = onDismiss,
            title = { Text("Couldn't Import") },
            text = { Text(stage.message) },
            confirmButton = { TextButton(onClick = onDismiss) { Text("OK") } }
        )
        is ImportStage.Idle, is ImportStage.SelectingPages -> Unit
    }
}

@Composable
private fun ProgressDialog(message: String) {
    AlertDialog(
        onDismissRequest = {},
        title = { Text(message) },
        text = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator(modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(12.dp))
                Text("This can take a few seconds.", style = MaterialTheme.typography.bodySmall)
            }
        },
        confirmButton = {}
    )
}
