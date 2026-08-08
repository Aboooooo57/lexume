package com.aboooooo57.lexume.network

import com.aboooooo57.lexume.data.model.TargetLanguage

/** Mirrors `Services/GoogleTranslateClient.swift`'s `TranslationService` protocol. */
interface TranslationService {
    suspend fun translate(text: String, language: TargetLanguage, preferGemini: Boolean): String
}
