package com.aboooooo57.lexume.data.local

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.settingsDataStore by preferencesDataStore(name = "lexume_settings")

/**
 * DataStore analog of macOS's `Models/AppSettings.swift` (`@AppStorage`-
 * backed UserDefaults keys/defaults). Secrets never live here - see
 * [SecureKeyStore]. Every setting is exposed as a `Flow` (collect with
 * `collectAsState` in Compose, the DataStore equivalent of `@AppStorage`'s
 * auto-updating property wrapper) plus a suspend setter.
 *
 * Note: there is no `ocrEngine` setting here, unlike the Swift version's
 * Vision-vs-VisionKit picker - Android's on-device OCR (M4) has only one
 * engine (ML Kit) so far, so there's nothing to choose between yet. Add it
 * back if/when a second on-device engine is ever wired in.
 */
class AppPreferences(private val context: Context) {
    private val store get() = context.settingsDataStore

    // Models
    val geminiModel: Flow<String> = flowFor(GEMINI_MODEL, DEFAULT_GEMINI_MODEL)
    suspend fun setGeminiModel(value: String) = set(GEMINI_MODEL, value)

    val elevenModel: Flow<String> = flowFor(ELEVEN_MODEL, DEFAULT_ELEVEN_MODEL)
    suspend fun setElevenModel(value: String) = set(ELEVEN_MODEL, value)

    val voiceId: Flow<String> = flowFor(VOICE_ID, DEFAULT_VOICE_ID)
    suspend fun setVoiceId(value: String) = set(VOICE_ID, value)

    // Voice tuning (all 0..1 except speed, matching AppSettings.swift's ranges)
    val stability: Flow<Float> = flowFor(STABILITY, 0.5f)
    suspend fun setStability(value: Float) = set(STABILITY, value)

    val similarityBoost: Flow<Float> = flowFor(SIMILARITY_BOOST, 0.75f)
    suspend fun setSimilarityBoost(value: Float) = set(SIMILARITY_BOOST, value)

    val style: Flow<Float> = flowFor(STYLE, 0.0f)
    suspend fun setStyle(value: Float) = set(STYLE, value)

    val speed: Flow<Float> = flowFor(SPEED, 1.0f)
    suspend fun setSpeed(value: Float) = set(SPEED, value)

    // Reading
    val readingTheme: Flow<String> = flowFor(READING_THEME, "system")
    suspend fun setReadingTheme(value: String) = set(READING_THEME, value)

    val fontFamily: Flow<String> = flowFor(FONT_FAMILY, "sans")
    suspend fun setFontFamily(value: String) = set(FONT_FAMILY, value)

    val fontSize: Flow<Float> = flowFor(FONT_SIZE, 18f)
    suspend fun setFontSize(value: Float) = set(FONT_SIZE, value)

    // Translation
    val targetLanguage: Flow<String> = flowFor(TARGET_LANGUAGE, "Persian")
    suspend fun setTargetLanguage(value: String) = set(TARGET_LANGUAGE, value)

    val translationEngine: Flow<String> = flowFor(TRANSLATION_ENGINE, "google")
    suspend fun setTranslationEngine(value: String) = set(TRANSLATION_ENGINE, value)

    // Audio behavior
    val audioMode: Flow<String> = flowFor(AUDIO_MODE, "manual")
    suspend fun setAudioMode(value: String) = set(AUDIO_MODE, value)

    val warnBeforeLongPageAudio: Flow<Boolean> = flowFor(WARN_LONG_AUDIO, true)
    suspend fun setWarnBeforeLongPageAudio(value: Boolean) = set(WARN_LONG_AUDIO, value)

    // Google Drive backup (M9)
    val driveLastBackup: Flow<String?> = store.data.map { it[DRIVE_LAST_BACKUP] }
    suspend fun setDriveLastBackup(value: String) = set(DRIVE_LAST_BACKUP, value)

    // Guided tour (M11) / onboarding - kept out of resetAllToDefaults, same
    // as AppSettings.swift keeps them out of its own `allKeys`.
    val hasSeenGuidedTour: Flow<Boolean> = flowFor(HAS_SEEN_GUIDED_TOUR, false)
    suspend fun setHasSeenGuidedTour(value: Boolean) = set(HAS_SEEN_GUIDED_TOUR, value)

    val hasDismissedOnboarding: Flow<Boolean> = flowFor(HAS_DISMISSED_ONBOARDING, false)
    suspend fun setHasDismissedOnboarding(value: Boolean) = set(HAS_DISMISSED_ONBOARDING, value)

    /** Restores every resettable preference above to its default - mirrors `AppSettings.resetAllToDefaults()`. */
    suspend fun resetAllToDefaults() {
        store.edit { prefs ->
            for (key in RESETTABLE_KEYS) prefs.remove(key)
        }
    }

    private fun flowFor(key: Preferences.Key<String>, default: String): Flow<String> =
        store.data.map { it[key] ?: default }

    private fun flowFor(key: Preferences.Key<Float>, default: Float): Flow<Float> =
        store.data.map { it[key] ?: default }

    private fun flowFor(key: Preferences.Key<Boolean>, default: Boolean): Flow<Boolean> =
        store.data.map { it[key] ?: default }

    private suspend fun <T> set(key: Preferences.Key<T>, value: T) {
        store.edit { it[key] = value }
    }

    companion object {
        const val DEFAULT_GEMINI_MODEL = "gemini-3.5-flash"
        const val DEFAULT_ELEVEN_MODEL = "eleven_multilingual_v2"
        const val DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"

        private val GEMINI_MODEL = stringPreferencesKey("geminiModel")
        private val ELEVEN_MODEL = stringPreferencesKey("elevenModel")
        private val VOICE_ID = stringPreferencesKey("voiceID")
        private val STABILITY = floatPreferencesKey("voiceStability")
        private val SIMILARITY_BOOST = floatPreferencesKey("voiceSimilarity")
        private val STYLE = floatPreferencesKey("voiceStyle")
        private val SPEED = floatPreferencesKey("voiceSpeed")
        private val READING_THEME = stringPreferencesKey("readingTheme")
        private val FONT_FAMILY = stringPreferencesKey("readerFontFamily")
        private val FONT_SIZE = floatPreferencesKey("readerFontSize")
        private val TARGET_LANGUAGE = stringPreferencesKey("targetLanguage")
        private val TRANSLATION_ENGINE = stringPreferencesKey("translationEngine")
        private val AUDIO_MODE = stringPreferencesKey("audioMode")
        private val WARN_LONG_AUDIO = booleanPreferencesKey("warnBeforeLongPageAudio")
        private val DRIVE_LAST_BACKUP = stringPreferencesKey("driveLastBackupDate")
        private val HAS_SEEN_GUIDED_TOUR = booleanPreferencesKey("hasSeenGuidedTour")
        private val HAS_DISMISSED_ONBOARDING = booleanPreferencesKey("hasDismissedOnboarding")

        private val RESETTABLE_KEYS: List<Preferences.Key<*>> = listOf(
            GEMINI_MODEL, ELEVEN_MODEL, VOICE_ID,
            STABILITY, SIMILARITY_BOOST, STYLE, SPEED,
            READING_THEME, FONT_FAMILY, FONT_SIZE,
            TARGET_LANGUAGE, TRANSLATION_ENGINE,
            AUDIO_MODE, WARN_LONG_AUDIO
        )
    }
}
