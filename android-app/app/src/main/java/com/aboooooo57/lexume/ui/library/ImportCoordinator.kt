package com.aboooooo57.lexume.ui.library

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.aboooooo57.lexume.data.local.AppPreferences
import com.aboooooo57.lexume.data.repository.PageExtractionService
import com.aboooooo57.lexume.data.repository.SessionRepository
import com.aboooooo57.lexume.pdf.PdfPageExtractor
import com.aboooooo57.lexume.support.LexumeException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** Mirrors `Import/ImportCoordinator.swift`'s `Stage`, extended with [Extracting]/[Result] - see [ImportCoordinator]. */
sealed class ImportStage {
    data object Idle : ImportStage()
    data class SelectingPages(val fileName: String, val pageCount: Int) : ImportStage()
    data object Creating : ImportStage()
    data class Extracting(val sessionName: String) : ImportStage()
    data class Result(
        val sessionId: String,
        val sessionName: String,
        val extractedTitle: String?,
        val error: String?
    ) : ImportStage()
    data class Error(val message: String) : ImportStage()
}

/**
 * Drives the import flow: routes a picked/pasted file to either the PDF
 * page picker or straight to a text/image session, then creates the
 * resulting session - mirrors `Import/ImportCoordinator.swift`. Extended
 * with one extra step Swift's version doesn't have: extracting the new
 * session's first page as an on-the-spot smoke test, and reporting the
 * result. On macOS/iPad, creating a session hands off to the Reader
 * immediately; on Android the Reader doesn't exist until M5, so there's
 * nowhere else yet to show that import (and the extraction pipeline behind
 * it) actually worked.
 */
class ImportCoordinator(
    private val context: Context,
    private val sessionRepository: SessionRepository,
    private val pdfPageExtractor: PdfPageExtractor,
    private val pageExtractionService: PageExtractionService,
    private val appPreferences: AppPreferences
) {
    var stage by mutableStateOf<ImportStage>(ImportStage.Idle)
        private set

    var selectedIndices by mutableStateOf<Set<Int>>(emptySet())
        private set

    /** The PDF bytes currently being paged through, when [stage] is [ImportStage.SelectingPages]. */
    val pdfDataForSelection: ByteArray? get() = pdfData

    private var pdfData: ByteArray? = null
    private var pendingFileName: String? = null

    fun handlePickedFile(uri: Uri, scope: CoroutineScope) {
        scope.launch {
            try {
                val (fileName, data) = readUri(uri)
                route(fileName, data, scope)
            } catch (e: Exception) {
                stage = ImportStage.Error("Couldn't read this file: ${e.message}")
            }
        }
    }

    fun startPastedText(text: String, scope: CoroutineScope) {
        val trimmed = text.trim()
        if (trimmed.isEmpty()) return
        createTextSession(deriveNameFromText(trimmed), trimmed, scope)
    }

    // updateSelectedIndices, not setSelectedIndices - the latter clashes at
    // the JVM signature level with the synthesized setter Kotlin generates
    // for the public `selectedIndices` property above (same class of bug
    // as the *ViewModel.searchText properties - see their doc comments).
    fun updateSelectedIndices(indices: Set<Int>) {
        selectedIndices = indices
    }

    fun confirmPageSelection(scope: CoroutineScope) {
        val data = pdfDataForSelection
        val fileName = pendingFileName
        if (data == null || fileName == null || selectedIndices.isEmpty()) return
        createPdfSession(deriveNameFromFileName(fileName), fileName, data, selectedIndices.sorted(), scope)
    }

    fun cancelSelection() {
        pdfData = null
        pendingFileName = null
        selectedIndices = emptySet()
        stage = ImportStage.Idle
    }

    fun dismiss() {
        stage = ImportStage.Idle
    }

    private suspend fun route(fileName: String, data: ByteArray, scope: CoroutineScope) {
        val ext = fileName.substringAfterLast('.', "").lowercase()
        val imageMime = imageMimeType(ext)
        when {
            ext == "pdf" -> {
                val pageCount = pdfPageExtractor.pageCount(data)
                if (pageCount <= 0) {
                    stage = ImportStage.Error("Couldn't read any pages from $fileName.")
                    return
                }
                pdfData = data
                pendingFileName = fileName
                selectedIndices = (0 until pageCount).toSet()
                stage = ImportStage.SelectingPages(fileName, pageCount)
            }
            imageMime != null -> {
                createImageSession(deriveNameFromFileName(fileName), fileName, data, imageMime, scope)
            }
            else -> {
                val text = String(data, Charsets.UTF_8).trim()
                if (text.isEmpty()) {
                    stage = ImportStage.Error("$fileName doesn't contain readable text.")
                    return
                }
                createTextSession(deriveNameFromFileName(fileName), text, scope)
            }
        }
    }

    private fun createPdfSession(
        name: String,
        fileName: String,
        data: ByteArray,
        indices: List<Int>,
        scope: CoroutineScope
    ) {
        stage = ImportStage.Creating
        scope.launch {
            try {
                val id = sessionRepository.createPdfSession(name, fileName, data, indices)
                pdfData = null
                pendingFileName = null
                selectedIndices = emptySet()
                extractFirstPage(id, name)
            } catch (e: Exception) {
                stage = ImportStage.Error("Couldn't create session: ${e.message}")
            }
        }
    }

    private fun createImageSession(
        name: String,
        fileName: String,
        data: ByteArray,
        mimeType: String,
        scope: CoroutineScope
    ) {
        stage = ImportStage.Creating
        scope.launch {
            try {
                val id = sessionRepository.createImageSession(name, fileName, data, mimeType)
                extractFirstPage(id, name)
            } catch (e: Exception) {
                stage = ImportStage.Error("Couldn't create session: ${e.message}")
            }
        }
    }

    private fun createTextSession(name: String, rawText: String, scope: CoroutineScope) {
        stage = ImportStage.Creating
        scope.launch {
            try {
                val id = sessionRepository.createTextSession(name, rawText)
                extractFirstPage(id, name)
            } catch (e: Exception) {
                stage = ImportStage.Error("Couldn't create session: ${e.message}")
            }
        }
    }

    private suspend fun extractFirstPage(sessionId: String, sessionName: String) {
        stage = ImportStage.Extracting(sessionName)
        try {
            val model = appPreferences.geminiModel.first()
            val page = pageExtractionService.textPage(sessionId, 1, model)
            stage = ImportStage.Result(sessionId, sessionName, page.title, null)
        } catch (e: LexumeException) {
            stage = ImportStage.Result(sessionId, sessionName, null, e.message)
        } catch (e: Exception) {
            stage = ImportStage.Result(sessionId, sessionName, null, e.message ?: "Unknown error")
        }
    }

    private suspend fun readUri(uri: Uri): Pair<String, ByteArray> = withContext(Dispatchers.IO) {
        val resolver = context.contentResolver
        val name = queryDisplayName(uri) ?: uri.lastPathSegment ?: "file"
        val bytes = resolver.openInputStream(uri)?.use { it.readBytes() }
            ?: throw LexumeException.NotFound("File")
        name to bytes
    }

    private fun queryDisplayName(uri: Uri): String? {
        val cursor = context.contentResolver.query(uri, null, null, null, null) ?: return null
        cursor.use {
            val nameIndex = it.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (nameIndex >= 0 && it.moveToFirst()) return it.getString(nameIndex)
        }
        return null
    }

    private companion object {
        fun imageMimeType(ext: String): String? = when (ext) {
            "jpg", "jpeg" -> "image/jpeg"
            "png" -> "image/png"
            "heic" -> "image/heic"
            "heif" -> "image/heif"
            else -> null
        }

        fun deriveNameFromFileName(fileName: String): String =
            fileName.substringBeforeLast('.', fileName)

        fun deriveNameFromText(text: String): String = text.take(50)
    }
}
