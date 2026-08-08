package com.aboooooo57.lexume.network

import com.aboooooo57.lexume.data.local.SecretKey
import com.aboooooo57.lexume.data.local.SecureKeyStore
import com.aboooooo57.lexume.ocr.MlKitOcrService

/**
 * Picks the extraction backend automatically: Gemini when a key is
 * configured, otherwise on-device ML Kit OCR. Mirrors
 * `Services/ExtractionServiceFactory.swift`. Resolved fresh on every call
 * (not cached) since the key can change at any time via Settings.
 */
class ExtractionServiceFactory(
    private val secureKeyStore: SecureKeyStore,
    private val ocr: MlKitOcrService
) {
    suspend fun make(): ExtractionService {
        val key = secureKeyStore.get(SecretKey.GEMINI_API_KEY)
        return if (!key.isNullOrEmpty()) {
            GeminiClient(secureKeyStore)
        } else {
            LocalExtractionService(ocr)
        }
    }
}
