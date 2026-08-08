package com.aboooooo57.lexume.support

import com.aboooooo57.lexume.ui.vocabulary.VocabularyEntryRow
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

/**
 * Ports `VocabularyListView.swift`'s `exportCSV`/`csvField` verbatim: same
 * header, same ISO8601 date formatting, same comma/quote/newline escaping.
 * The Swift version writes straight to a file (`NSSavePanel` on macOS,
 * `.fileExporter` on iOS); here the caller (`VocabularyScreen`) hands the
 * returned string to a SAF `ActivityResultContracts.CreateDocument` stream.
 */
object VocabularyCsvExporter {
    private val iso8601 = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    fun export(entries: List<VocabularyEntryRow>): String {
        val csv = StringBuilder("word,date,session,definition\n")
        for (entry in entries) {
            val row = listOf(
                csvField(entry.word),
                csvField(iso8601.format(entry.createdAt)),
                csvField(entry.sessionName),
                csvField(entry.definitionSnippet ?: "")
            )
            csv.append(row.joinToString(",")).append("\n")
        }
        return csv.toString()
    }

    private fun csvField(value: String): String {
        return if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            "\"" + value.replace("\"", "\"\"") + "\""
        } else {
            value
        }
    }
}
