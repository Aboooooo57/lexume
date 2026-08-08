package com.aboooooo57.lexume

import android.app.Application
import com.aboooooo57.lexume.data.local.LexumeDatabase
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

    // DataStore-backed key storage (macOS analog: `KeychainStore.swift`) is
    // added here in M3, when Settings/onboarding first need it.
}
