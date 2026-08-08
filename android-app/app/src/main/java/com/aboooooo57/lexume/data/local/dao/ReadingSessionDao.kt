package com.aboooooo57.lexume.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update
import com.aboooooo57.lexume.data.local.entity.ReadingSessionEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ReadingSessionDao {
    @Insert
    suspend fun insert(session: ReadingSessionEntity)

    @Update
    suspend fun update(session: ReadingSessionEntity)

    @Query("SELECT * FROM reading_sessions WHERE id = :sessionId")
    suspend fun getById(sessionId: String): ReadingSessionEntity?

    /** Library list ordering - mirrors `LibraryView.swift`'s default sort (newest first). */
    @Query("SELECT * FROM reading_sessions ORDER BY createdAt DESC")
    fun observeAll(): Flow<List<ReadingSessionEntity>>

    @Query("SELECT id FROM reading_sessions")
    suspend fun getAllIds(): List<String>

    @Query("DELETE FROM reading_sessions WHERE id = :sessionId")
    suspend fun delete(sessionId: String)

    @Query("UPDATE reading_sessions SET lastPage = :page WHERE id = :sessionId")
    suspend fun updateLastPage(sessionId: String, page: Int)

    @Query("UPDATE reading_sessions SET name = :name WHERE id = :sessionId")
    suspend fun updateName(sessionId: String, name: String)

    @Query(
        "UPDATE reading_sessions SET lastAudioPage = :page, lastAudioPosition = :position WHERE id = :sessionId"
    )
    suspend fun updateAudioPosition(sessionId: String, page: Int, position: Double)
}
