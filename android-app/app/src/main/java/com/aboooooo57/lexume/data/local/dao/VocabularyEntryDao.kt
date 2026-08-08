package com.aboooooo57.lexume.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update
import com.aboooooo57.lexume.data.local.entity.VocabularyEntryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface VocabularyEntryDao {
    @Insert
    suspend fun insert(entry: VocabularyEntryEntity)

    @Update
    suspend fun update(entry: VocabularyEntryEntity)

    @Query("SELECT * FROM vocabulary_entries WHERE sessionId = :sessionId AND word = :word LIMIT 1")
    suspend fun findByWord(sessionId: String, word: String): VocabularyEntryEntity?

    /** Drive backup (M9). */
    @Query("SELECT * FROM vocabulary_entries WHERE sessionId = :sessionId")
    suspend fun getForSession(sessionId: String): List<VocabularyEntryEntity>

    /** Library's vocabulary tree (M8) regroups this flat, newest-first list by session. */
    @Query("SELECT * FROM vocabulary_entries ORDER BY createdAt DESC")
    fun observeAll(): Flow<List<VocabularyEntryEntity>>
}
