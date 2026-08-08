package com.aboooooo57.lexume.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.aboooooo57.lexume.data.local.dao.BookmarkDao
import com.aboooooo57.lexume.data.local.dao.ReadingSessionDao
import com.aboooooo57.lexume.data.local.dao.SessionPageDao
import com.aboooooo57.lexume.data.local.dao.VocabularyEntryDao
import com.aboooooo57.lexume.data.local.entity.BookmarkEntity
import com.aboooooo57.lexume.data.local.entity.ReadingSessionEntity
import com.aboooooo57.lexume.data.local.entity.SessionPageEntity
import com.aboooooo57.lexume.data.local.entity.VocabularyEntryEntity

/**
 * Room analog of macOS's SwiftData `ModelContainer` - created once in
 * `LexumeApp.swift`'s `init()` there; created once in
 * `LexumeApplication.kt` here via [getInstance].
 */
@Database(
    entities = [
        ReadingSessionEntity::class,
        SessionPageEntity::class,
        BookmarkEntity::class,
        VocabularyEntryEntity::class
    ],
    version = 1,
    exportSchema = true
)
@TypeConverters(Converters::class)
abstract class LexumeDatabase : RoomDatabase() {
    abstract fun readingSessionDao(): ReadingSessionDao
    abstract fun sessionPageDao(): SessionPageDao
    abstract fun bookmarkDao(): BookmarkDao
    abstract fun vocabularyEntryDao(): VocabularyEntryDao

    companion object {
        @Volatile private var instance: LexumeDatabase? = null

        fun getInstance(context: Context): LexumeDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    LexumeDatabase::class.java,
                    "lexume.db"
                ).build().also { instance = it }
            }
    }
}
