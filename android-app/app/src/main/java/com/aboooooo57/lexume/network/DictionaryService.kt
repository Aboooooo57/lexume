package com.aboooooo57.lexume.network

import com.aboooooo57.lexume.data.model.DictionaryEntry
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/** Mirrors `Services/FreeDictionaryClient.swift`'s `DictionaryService` protocol. */
interface DictionaryService {
    suspend fun define(word: String): DictionaryEntry?
}

/**
 * Small in-memory cache so repeated lookups of the same word (common when
 * following synonyms back and forth) don't keep hitting the network.
 * Mirrors `FreeDictionaryClient.swift`'s `DictionaryCache` actor, using a
 * [Mutex] for the same "safe concurrent access" guarantee an actor gives on
 * the Swift side.
 */
object DictionaryCache {
    private val lock = Mutex()
    private val storage = mutableMapOf<String, DictionaryEntry>()

    suspend fun get(word: String): DictionaryEntry? = lock.withLock { storage[word] }

    suspend fun set(word: String, entry: DictionaryEntry) {
        lock.withLock { storage[word] = entry }
    }
}
