package com.aboooooo57.lexume.ui.reader

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FastForward
import androidx.compose.material.icons.filled.FastRewind
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Replay
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * Floating playback controls - shown below the reader when audio is
 * available (or being generated), hidden entirely when audio mode is "off".
 * Mirrors `Reader/PlayerBarView.swift`, with a Material3 [Slider] standing
 * in for the Swift version's hand-rolled `GeometryReader`+`DragGesture`
 * progress bar - Slider already gives drag-to-seek for free, no need to
 * reimplement that gesture logic here.
 */
@Composable
fun PlayerBarView(
    hasAudio: Boolean,
    isGeneratingAudio: Boolean,
    audioError: String?,
    playbackEngine: PlaybackEngine,
    onGenerateAudio: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 10.dp)
    ) {
        if (audioError != null) {
            Text(
                audioError,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
                maxLines = 2,
                modifier = Modifier.padding(bottom = 6.dp)
            )
        }

        when {
            hasAudio -> PlaybackControls(playbackEngine)
            isGeneratingAudio -> LoadingRow("Generating narration…")
            else -> Button(onClick = onGenerateAudio) {
                Icon(Icons.Filled.GraphicEq, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text("Generate Audio")
            }
        }
    }
}

@Composable
private fun LoadingRow(message: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        CircularProgressIndicator(
            modifier = Modifier
                .height(16.dp)
                .width(16.dp),
            strokeWidth = 2.dp
        )
        Spacer(Modifier.width(8.dp))
        Text(message, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun PlaybackControls(engine: PlaybackEngine) {
    Column {
        Slider(
            value = engine.currentTime.toFloat(),
            onValueChange = { engine.seek(it.toDouble()) },
            valueRange = 0f..maxOf(engine.duration.toFloat(), 0.01f)
        )
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                formatTime(engine.currentTime),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.width(40.dp)
            )
            Spacer(Modifier.weight(1f))
            IconButton(onClick = { engine.restart() }) {
                Icon(Icons.Filled.Replay, contentDescription = "Restart")
            }
            IconButton(onClick = { engine.skip(-15.0) }) {
                Icon(Icons.Filled.FastRewind, contentDescription = "Back 15 seconds")
            }
            IconButton(onClick = { engine.toggle() }) {
                Icon(
                    if (engine.isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                    contentDescription = if (engine.isPlaying) "Pause" else "Play",
                    modifier = Modifier
                        .height(32.dp)
                        .width(32.dp)
                )
            }
            IconButton(onClick = { engine.skip(15.0) }) {
                Icon(Icons.Filled.FastForward, contentDescription = "Forward 15 seconds")
            }
            Spacer(Modifier.weight(1f))
            Text(
                formatTime(engine.duration),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.width(40.dp)
            )
        }
    }
}

private fun formatTime(seconds: Double): String {
    if (!seconds.isFinite() || seconds < 0) return "0:00"
    val total = seconds.toInt()
    return "%d:%02d".format(total / 60, total % 60)
}
