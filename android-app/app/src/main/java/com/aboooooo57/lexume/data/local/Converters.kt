package com.aboooooo57.lexume.data.local

import androidx.room.TypeConverter
import org.json.JSONArray
import java.util.Date

/**
 * Room type converters - mirrors what SwiftData handles natively for `Date`
 * and `[Int]` columns in `Models/Schema.swift`. Uses `org.json` (bundled
 * with Android, no extra dependency) rather than the not-yet-wired
 * kotlinx.serialization for this one small conversion.
 */
class Converters {
    @TypeConverter
    fun dateToTimestamp(date: Date?): Long? = date?.time

    @TypeConverter
    fun timestampToDate(value: Long?): Date? = value?.let { Date(it) }

    @TypeConverter
    fun intListToString(list: List<Int>?): String? =
        list?.let { JSONArray(it).toString() }

    @TypeConverter
    fun stringToIntList(value: String?): List<Int>? {
        if (value.isNullOrEmpty()) return emptyList()
        val array = JSONArray(value)
        return List(array.length()) { array.getInt(it) }
    }
}
