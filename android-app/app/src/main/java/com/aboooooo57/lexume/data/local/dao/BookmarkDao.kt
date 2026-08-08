package com.aboooooo57.lexume.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.Query
import com.aboooooo57.lexume.data.local.entity.BookmarkEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface BookmarkDao {
    @Insert
    suspend fun insert(bookmark: BookmarkEntity)

    @Delete
    suspend fun delete(bookmark: BookmarkEntity)

    @Query("SELECT * FROM bookmarks WHERE sessionId = :sessionId AND text = :text LIMIT 1")
    suspend fun findByText(sessionId: String, text: String): BookmarkEntity?

    @Query("SELECT * FROM bookmarks WHERE sessionId = :sessionId")
    suspend fun getForSession(sessionId: String): List<BookmarkEntity>

    @Query("SELECT * FROM bookmarks ORDER BY createdAt DESC")
    fun observeAll(): Flow<List<BookmarkEntity>>
}
