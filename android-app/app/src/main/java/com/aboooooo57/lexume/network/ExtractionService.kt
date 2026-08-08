package com.aboooooo57.lexume.network

/** Mirrors `Services/GeminiClient.swift`'s `ExtractedPage`. */
data class ExtractedPage(val title: String, val text: String)

/**
 * Mirrors `Services/GeminiClient.swift`'s `ExtractionService` protocol, with
 * one deliberate simplification: there's no `extractPDFPage` here the way
 * there is on macOS. PDFKit can slice out a standalone single-page PDF to
 * upload; Android's `PdfRenderer` (see `pdf/PdfPageExtractor.kt`) can only
 * rasterize a page to a bitmap, not re-encode a subset as a new PDF file -
 * so PDF pages are rendered to a JPEG first and routed through
 * [extractImage] instead (Gemini reads either format equally well).
 * `keyTerms`/`defineWord`/`translate` (Gemini-only on the Swift side too,
 * not part of this shared interface) arrive with M6's dictionary/
 * translation work.
 */
interface ExtractionService {
    suspend fun extractImage(imageData: ByteArray, mimeType: String, model: String): ExtractedPage
    suspend fun reformat(text: String, model: String): ExtractedPage
}
