package com.aboooooo57.lexume

import android.app.Application

/**
 * Application-scoped setup. Empty for now (M1 scaffold) - the Room database
 * and DataStore-backed key storage singletons (macOS analogs:
 * `PersistenceActor.swift`, `KeychainStore.swift`) get created here starting
 * M2/M3, so the rest of the app can obtain them without a DI framework.
 */
class LexumeApplication : Application()
