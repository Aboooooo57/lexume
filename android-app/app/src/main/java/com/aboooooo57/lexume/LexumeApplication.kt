package com.aboooooo57.lexume

import android.app.Application
import com.aboooooo57.lexume.data.local.AppPreferences
import com.aboooooo57.lexume.data.local.LexumeDatabase
import com.aboooooo57.lexume.data.local.SecureKeyStore
import com.aboooooo57.lexume.data.repository.PageExtractionService
import com.aboooooo57.lexume.data.repository.SessionRepository
import com.aboooooo57.lexume.network.ExtractionServiceFactory
import com.aboooooo57.lexume.ocr.MlKitOcrService
import com.aboooooo57.lexume.pdf.PdfPageExtractor

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

    // Import & extraction (M4). PdfPageExtractor needs a Context (temp
    // files in cacheDir); MlKitOcrService/ExtractionServiceFactory don't,
    // but live here for the same "one shared instance, not rebuilt per
    // screen" reasoning as everything else on this page.
    val pdfPageExtractor: PdfPageExtractor by lazy { PdfPageExtractor(this) }
    private val ocrService: MlKitOcrService by lazy { MlKitOcrService() }
    val extractionServiceFactory: ExtractionServiceFactory by lazy {
        ExtractionServiceFactory(secureKeyStore, ocrService)
    }
    val pageExtractionService: PageExtractionService by lazy {
        PageExtractionService(sessionRepository, pdfPageExtractor, extractionServiceFactory, secureKeyStore)
    }
}
