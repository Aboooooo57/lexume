package com.aboooooo57.lexume.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update
import com.aboooooo57.lexume.data.local.entity.SessionPageEntity

@Dao
interface SessionPageDao {
    @Insert
    suspend fun insert(page: SessionPageEntity): Long

    @Update
    suspend fun update(page: SessionPageEntity)

    @Query("SELECT * FROM session_pages WHERE sessionId = :sessionId AND pageNumber = :pageNumber LIMIT 1")
    suspend fun getPage(sessionId: String, pageNumber: Int): SessionPageEntity?

    @Query("SELECT * FROM session_pages WHERE sessionId = :sessionId ORDER BY pageNumber")
    suspend fun getPagesForSession(sessionId: String): List<SessionPageEntity>

    /** Backs Settings' "Clear Cached Pages" action (M3) - sessions themselves are untouched. */
    @Query("DELETE FROM session_pages")
    suspend fun deleteAllPages()
}
