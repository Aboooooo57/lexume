package com.aboooooo57.lexume.ui.bookmarks

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.OpenInNew
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aboooooo57.lexume.data.repository.SessionRepository
import java.text.DateFormat

/**
 * Every bookmarked paragraph across all sessions, newest first. Mirrors
 * `Library/BookmarksListView.swift`; tapping a row jumps to that session
 * (not a specific scroll position within it, same as Swift).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BookmarksScreen(sessionRepository: SessionRepository, onOpenSession: (String) -> Unit) {
    val viewModel = remember { BookmarksViewModel(sessionRepository) }
    LaunchedEffect(Unit) { viewModel.observe() }

    val query = viewModel.searchText.trim()
    val filtered = if (query.isEmpty()) {
        viewModel.bookmarks
    } else {
        viewModel.bookmarks.filter { it.text.contains(query, ignoreCase = true) }
    }

    Scaffold(topBar = { TopAppBar(title = { Text("Bookmarks") }) }) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            if (viewModel.bookmarks.isNotEmpty()) {
                OutlinedTextField(
                    value = viewModel.searchText,
                    onValueChange = { viewModel.updateSearchText(it) },
                    placeholder = { Text("Search bookmarks") },
                    leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                    singleLine = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                )
            }

            when {
                viewModel.bookmarks.isEmpty() -> Box(
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Filled.Bookmark,
                            contentDescription = null,
                            modifier = Modifier.size(44.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(Modifier.height(8.dp))
                        Text("No Bookmarks Yet", style = MaterialTheme.typography.titleMedium)
                        Spacer(Modifier.height(4.dp))
                        Text(
                            "Paragraphs you bookmark while reading will appear here.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                filtered.isEmpty() -> Box(
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "No bookmarks match \"${viewModel.searchText}\"",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                else -> LazyColumn(modifier = Modifier.weight(1f).fillMaxWidth()) {
                    items(filtered, key = { it.id }) { bookmark ->
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onOpenSession(bookmark.sessionId) }
                                .padding(horizontal = 16.dp, vertical = 10.dp)
                        ) {
                            Text(bookmark.text, style = MaterialTheme.typography.bodyMedium, maxLines = 4)
                            Spacer(Modifier.height(4.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    Icons.Filled.OpenInNew,
                                    contentDescription = null,
                                    modifier = Modifier.size(12.dp),
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(Modifier.width(3.dp))
                                Text(
                                    bookmark.sessionName,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(Modifier.width(10.dp))
                                Text(
                                    DateFormat.getDateInstance(DateFormat.MEDIUM).format(bookmark.createdAt),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                        HorizontalDivider()
                    }
                }
            }
        }
    }
}
