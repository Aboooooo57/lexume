package com.aboooooo57.lexume.data.model

import org.json.JSONArray
import org.json.JSONObject

/** One spoken word's timing window, in seconds from the start of the audio. Mirrors `Models/WordTiming.swift`. */
data class WordTiming(val word: String, val start: Double, val end: Double) {
    companion object {
        fun listFromJson(bytes: ByteArray): List<WordTiming> {
            val array = JSONArray(String(bytes, Charsets.UTF_8))
            return (0 until array.length()).map { i ->
                val o = array.getJSONObject(i)
                WordTiming(word = o.getString("word"), start = o.getDouble("start"), end = o.getDouble("end"))
            }
        }

        fun listToJson(timings: List<WordTiming>): ByteArray {
            val array = JSONArray()
            for (timing in timings) {
                array.put(
                    JSONObject()
                        .put("word", timing.word)
                        .put("start", timing.start)
                        .put("end", timing.end)
                )
            }
            return array.toString().toByteArray(Charsets.UTF_8)
        }
    }
}
