package com.aboooooo57.lexume.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.weight
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

/** Test-result state for an [ApiKeyField]. Mirrors `APIKeyTestStatus` (`Settings/APIKeyField.swift`). */
sealed class ApiKeyTestStatus {
    object Idle : ApiKeyTestStatus()
    object Testing : ApiKeyTestStatus()
    object Ok : ApiKeyTestStatus()
    data class Failed(val reason: String) : ApiKeyTestStatus()
}

/**
 * A titled API-key entry row: password field, inline Test button, status
 * icon/caption. Mirrors `Settings/APIKeyField.swift`, shared by the
 * onboarding and Settings screens the same way the Swift version is shared
 * by `OnboardingSheet`/`SettingsView`.
 */
@Composable
fun ApiKeyField(
    title: String,
    subtitle: String,
    value: String,
    onValueChange: (String) -> Unit,
    status: ApiKeyTestStatus,
    onTest: suspend () -> Unit,
    modifier: Modifier = Modifier
) {
    val scope = rememberCoroutineScope()
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(title, style = MaterialTheme.typography.titleMedium)
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = value,
                onValueChange = onValueChange,
                placeholder = { Text("Paste key") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.weight(1f)
            )
            TextButton(
                onClick = { scope.launch { onTest() } },
                enabled = value.trim().isNotEmpty() && status !is ApiKeyTestStatus.Testing
            ) {
                Text("Test")
            }
            when (status) {
                is ApiKeyTestStatus.Idle -> Unit
                is ApiKeyTestStatus.Testing ->
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                is ApiKeyTestStatus.Ok ->
                    Icon(Icons.Filled.CheckCircle, contentDescription = "Valid", tint = MaterialTheme.colorScheme.primary)
                is ApiKeyTestStatus.Failed ->
                    Icon(Icons.Filled.Cancel, contentDescription = "Invalid", tint = MaterialTheme.colorScheme.error)
            }
        }
        val caption = (status as? ApiKeyTestStatus.Failed)?.reason ?: subtitle
        Text(
            caption,
            style = MaterialTheme.typography.bodySmall,
            color = if (status is ApiKeyTestStatus.Failed) {
                MaterialTheme.colorScheme.error
            } else {
                MaterialTheme.colorScheme.onSurfaceVariant
            }
        )
    }
}
