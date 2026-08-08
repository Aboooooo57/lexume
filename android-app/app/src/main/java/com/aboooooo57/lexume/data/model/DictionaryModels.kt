package com.aboooooo57.lexume.data.model

import org.json.JSONArray
import org.json.JSONObject

/** Mirrors the free dictionaryapi.dev response shape (only the fields we use) - ported from `Models/DictionaryModels.swift`. */
data class DictionaryEntry(
    val word: String,
    val phonetic: String?,
    val phonetics: List<Phonetic>,
    val meanings: List<Meaning>
) {
    data class Phonetic(val text: String?, val audio: String?)

    data class Definition(val definition: String, val example: String?, val synonyms: List<String>)

    data class Meaning(val partOfSpeech: String, val definitions: List<Definition>, val synonyms: List<String>)

    companion object {
        /** Parses a single entry object - used by both dictionaryapi.dev (an array of these) and Gemini's structured JSON (a single object). */
        fun fromJson(json: JSONObject): DictionaryEntry {
            val phoneticsArray = json.optJSONArray("phonetics")
            val phonetics = (0 until (phoneticsArray?.length() ?: 0)).map { i ->
                val p = phoneticsArray!!.getJSONObject(i)
                Phonetic(text = p.optStringOrNull("text"), audio = p.optStringOrNull("audio"))
            }
            val meaningsArray = json.optJSONArray("meanings")
            val meanings = (0 until (meaningsArray?.length() ?: 0)).map { i ->
                meaningFromJson(meaningsArray!!.getJSONObject(i))
            }
            return DictionaryEntry(
                word = json.getString("word"),
                phonetic = json.optStringOrNull("phonetic"),
                phonetics = phonetics,
                meanings = meanings
            )
        }

        /** Parses the free dictionary API's top-level response: an array of entries, we only want the first. */
        fun firstFromJsonArray(json: JSONArray): DictionaryEntry? {
            if (json.length() == 0) return null
            return fromJson(json.getJSONObject(0))
        }

        private fun meaningFromJson(json: JSONObject): Meaning {
            val definitionsArray = json.optJSONArray("definitions")
            val definitions = (0 until (definitionsArray?.length() ?: 0)).map { i ->
                val d = definitionsArray!!.getJSONObject(i)
                Definition(
                    definition = d.getString("definition"),
                    example = d.optStringOrNull("example"),
                    synonyms = d.optJSONArray("synonyms").toStringList()
                )
            }
            return Meaning(
                partOfSpeech = json.getString("partOfSpeech"),
                definitions = definitions,
                synonyms = json.optJSONArray("synonyms").toStringList()
            )
        }
    }
}

private fun JSONObject.optStringOrNull(key: String): String? =
    if (has(key) && !isNull(key)) optString(key) else null

private fun JSONArray?.toStringList(): List<String> {
    if (this == null) return emptyList()
    return (0 until length()).map { getString(it) }
}
