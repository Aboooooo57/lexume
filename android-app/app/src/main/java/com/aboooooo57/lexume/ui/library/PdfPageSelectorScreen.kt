package com.aboooooo57.lexume.ui.library

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.aboooooo57.lexume.pdf.PdfPageExtractor
import com.aboooooo57.lexume.support.PageRangeParser

/**
 * Mirrors `Import/PDFPageSelectorView.swift`'s thumbnail grid + range text
 * field. Presented as a full-screen [Dialog] rather than a nav route - the
 * data involved (the PDF's raw bytes, a live selection set) doesn't fit
 * Navigation Compose's route-argument model without a shared ViewModel, and
 * this screen really is modal (mirrors the Swift version's own `.sheet`).
 * The Swift version's per-page "Zoom In" context menu isn't ported - Android
 * has no equivalent right-click convention and the grid thumbnails are
 * already reasonably legible; worth revisiting if that turns out wrong on a
 * real device.
 */
@Composable
fun PdfPageSelectorScreen(
    pdfData: ByteArray,
    fileName: String,
    pageCount: Int,
    selectedIndices: Set<Int>,
    onSelectionChange: (Set<Int>) -> Unit,
    onConfirm: () -> Unit,
    onCancel: () -> Unit,
    pdfPageExtractor: PdfPageExtractor
) {
    var rangeText by remember { mutableStateOf(PageRangeParser.format(selectedIndices.toList())) }
    val thumbnails = remember { mutableStateMapOf<Int, Bitmap>() }

    fun syncRangeText() {
        rangeText = PageRangeParser.format(selectedIndices.toList())
    }

    fun toggle(index: Int) {
        onSelectionChange(
            if (selectedIndices.contains(index)) selectedIndices - index else selectedIndices + index
        )
        syncRangeText()
    }

    Dialog(onDismissRequest = onCancel, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Scaffold { innerPadding ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Choose Pages", style = MaterialTheme.typography.titleLarge)
                    Text(
                        fileName,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(Modifier.height(10.dp))
                    // Two rows, not one Row with a weight(1f) spacer before
                    // "Select All"/"Clear" - on a real device that squeezed
                    // "Clear" down to a near-zero-width column (each letter
                    // wrapping to its own line) once the range field +
                    // "Apply" had already eaten most of the row's width.
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                        OutlinedTextField(
                            value = rangeText,
                            onValueChange = { rangeText = it },
                            placeholder = { Text("e.g. 1-3,5") },
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                        Spacer(Modifier.width(8.dp))
                        TextButton(onClick = {
                            onSelectionChange(PageRangeParser.parse(rangeText, pageCount).toSet())
                        }) {
                            Text("Apply")
                        }
                    }
                    Spacer(Modifier.height(4.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                        TextButton(onClick = {
                            onSelectionChange((0 until pageCount).toSet())
                            syncRangeText()
                        }) {
                            Text("Select All")
                        }
                        TextButton(onClick = {
                            onSelectionChange(emptySet())
                            syncRangeText()
                        }) {
                            Text("Clear")
                        }
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "${selectedIndices.size} of $pageCount pages selected",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                HorizontalDivider()

                LazyVerticalGrid(
                    columns = GridCells.Adaptive(minSize = 110.dp),
                    contentPadding = PaddingValues(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier
                        .fillMaxSize()
                        .weight(1f)
                ) {
                    items(pageCount) { index ->
                        PageThumbnailCard(
                            index = index,
                            isSelected = selectedIndices.contains(index),
                            bitmap = thumbnails[index],
                            onToggle = { toggle(index) }
                        )
                        LaunchedEffect(index) {
                            if (thumbnails[index] == null) {
                                val bitmap = pdfPageExtractor.renderPage(pdfData, index, THUMBNAIL_WIDTH_PX)
                                if (bitmap != null) thumbnails[index] = bitmap
                            }
                        }
                    }
                }

                HorizontalDivider()

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onCancel) { Text("Cancel") }
                    Spacer(Modifier.weight(1f))
                    TextButton(onClick = onConfirm, enabled = selectedIndices.isNotEmpty()) {
                        Text("Start Reading")
                    }
                }
            }
        }
    }
}

@Composable
private fun PageThumbnailCard(
    index: Int,
    isSelected: Boolean,
    bitmap: Bitmap?,
    onToggle: () -> Unit
) {
    Column {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(130f / 168f)
                .clip(RoundedCornerShape(6.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .border(
                    width = 3.dp,
                    color = if (isSelected) MaterialTheme.colorScheme.primary else Color.Transparent,
                    shape = RoundedCornerShape(6.dp)
                )
                .clickable(onClick = onToggle)
        ) {
            if (bitmap != null) {
                Image(
                    bitmap = bitmap.asImageBitmap(),
                    contentDescription = "Page ${index + 1}",
                    modifier = Modifier.fillMaxSize()
                )
            } else {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            }
            Icon(
                if (isSelected) Icons.Filled.CheckCircle else Icons.Filled.RadioButtonUnchecked,
                contentDescription = if (isSelected) "Selected" else "Not selected",
                tint = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(4.dp)
            )
        }
        Spacer(Modifier.height(4.dp))
        Text(
            "${index + 1}",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.align(Alignment.CenterHorizontally)
        )
    }
}

private const val THUMBNAIL_WIDTH_PX = 260
