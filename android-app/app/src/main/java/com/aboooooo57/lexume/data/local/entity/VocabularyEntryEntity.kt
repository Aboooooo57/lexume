package com.aboooooo57.lexume.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import java.util.Date

/** Room analog of macOS's `Models/Schema.swift` `VocabularyEntry` @Model. */
@Entity(
    tableName = "vocabulary_entries",
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
data class VocabularyEntryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sessionId: String,
    val word: String,
    val createdAt: Date = Date(),
    val definitionSnippet: String? = null
)
