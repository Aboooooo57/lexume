package com.aboooooo57.lexume.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.Date
import java.util.UUID

/**
 * Room analog of macOS's `Models/Schema.swift` `ReadingSession` @Model.
 * Unlike the Swift app - which bridges between SwiftData's ephemeral
 * `PersistentIdentifier` (used for local navigation) and this same stable
 * `id` (used for Drive backup identity) - Android uses this UUID string as
 * the one and only session identifier everywhere, no dual-identifier
 * bridging needed.
 *
 * Note: this is a `data class` with `ByteArray` properties, so the
 * generated `equals`/`hashCode` compare those fields by reference, not
 * content - fine here since nothing in this app diffs sessions by full
 * structural equality (Compose/Flow consumers key by `id`), just don't rely
 * on `==` for content comparison of `originalDocument`.
 */
@Entity(tableName = "reading_sessions")
data class ReadingSessionEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val name: String = "Untitled",
    /** "pdf", "text", or "image" */
    val sourceType: String = "pdf",
    val createdAt: Date = Date(),
    val totalPages: Int = 1,
    /** 1-based page the user last viewed. */
    val lastPage: Int = 1,
    val lastAudioPage: Int? = null,
    val lastAudioPosition: Double? = null,
    /** 0-based indices into the original PDF for the pages the user selected. */
    val selectedPageIndices: List<Int> = emptyList(),
    val originalFileName: String? = null,
    /** Copy of the imported document (PDF or image bytes) - source of truth for lazy page extraction. */
    val originalDocument: ByteArray? = null,
    /** For sourceType "text": the pasted/plain-text/markdown source. Single-page sessions only. */
    val rawSourceText: String? = null,
    /** For sourceType "image": the MIME type of originalDocument (e.g. "image/jpeg"). */
    val sourceMimeType: String? = null
)
