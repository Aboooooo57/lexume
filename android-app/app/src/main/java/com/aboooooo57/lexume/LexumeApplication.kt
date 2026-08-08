package com.aboooooo57.lexume

import android.app.Application
import com.aboooooo57.lexume.data.local.AppPreferences
import com.aboooooo57.lexume.data.local.LexumeDatabase
import com.aboooooo57.lexume.data.local.SecureKeyStore
import com.aboooooo57.lexume.data.repository.SessionRepository

/**
 * Application-scoped setup - the Android analog of `LexumeApp.swift`'s
 * `init()`, which builds the SwiftData `ModelContainer` once for the whole
 * app. No DI framework here (Hilt/Koin) - deliberately kept as simple lazy
 * singletons, matching the scale of this app; revisit only if the object
 * graph outgrows this.
 */
class LexumeApplication : Application() {
    val database: LexumeDatabase by lazy { LexumeDatabase.getInstance(this) }
    val sessionRepository: SessionRepository by lazy { SessionRepository(database) }

    // DataStore-backed key storage (macOS analog: `KeychainStore.swift`) and
    // settings (macOS analog: `AppSettings.swift`), added in M3.
    val secureKeyStore: SecureKeyStore by lazy { SecureKeyStore(this) }
    val appPreferences: AppPreferences by lazy { AppPreferences(this) }
}
