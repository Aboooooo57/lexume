package com.aboooooo57.lexume.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Room analog of macOS's `Models/Schema.swift` `SessionPage` @Model.
 * `onDelete = CASCADE` mirrors SwiftData's
 * `@Relationship(deleteRule: .cascade, inverse: \SessionPage.session)`.
 */
@Entity(
    tableName = "session_pages",
    foreignKeys = [
        ForeignKey(
            entity = ReadingSessionEntity::class,
            parentColumns = ["id"],
            childColumns = ["sessionId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("sessionId")]
)
data class SessionPageEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sessionId: String,
    /** 1-based position within the session (not the original PDF page number). */
    val pageNumber: Int,
    val title: String? = null,
    /** Clean prose from Gemini; paragraphs derived by splitting on blank lines. */
    val extractedText: String? = null,
    val audioData: ByteArray? = null,
    /** JSON-encoded List<WordTiming>. */
    val wordTimingsJson: ByteArray? = null,
    /** JSON-encoded List<ByteArray> of extracted page images (PNG, >=100px). */
    val pageImagesJson: ByteArray? = null,
    /** JSON-encoded List<WordBox> from on-device OCR - Original Layout mode, Phase 2. */
    val wordBoxesJson: ByteArray? = null
)
