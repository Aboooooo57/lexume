package com.aboooooo57.lexume.pdf

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import java.io.ByteArrayOutputStream
import java.io.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Wraps `android.graphics.pdf.PdfRenderer` (rasterization only - it has no
 * page-extraction/slicing API the way PDFKit does) - the Android analog of
 * `Services/PDFPageExtractor.swift`. `PdfRenderer` needs a real file
 * descriptor, so page bytes (stored as a BLOB in Room) are written to a
 * throwaway temp file for the duration of each call.
 */
class PdfPageExtractor(private val context: Context) {
    suspend fun pageCount(pdfData: ByteArray): Int = withContext(Dispatchers.IO) {
        withRenderer(pdfData) { renderer -> renderer.pageCount }
    }

    /**
     * Renders one page to a bitmap scaled to [targetWidthPx], preserving
     * aspect ratio - used both for the page-selector's thumbnails (small
     * [targetWidthPx]) and for the actual extraction upload/OCR input
     * (larger [targetWidthPx]).
     */
    suspend fun renderPage(pdfData: ByteArray, pageIndex: Int, targetWidthPx: Int): Bitmap? =
        withContext(Dispatchers.IO) {
            withRenderer(pdfData) { renderer ->
                if (pageIndex !in 0 until renderer.pageCount) return@withRenderer null
                renderer.openPage(pageIndex).use { page ->
                    val scale = targetWidthPx.toFloat() / page.width
                    val height = (page.height * scale).toInt().coerceAtLeast(1)
                    val bitmap = Bitmap.createBitmap(targetWidthPx, height, Bitmap.Config.ARGB_8888)
                    // PDF pages can have a transparent background; without
                    // this a "transparent" page would OCR/upload as black.
                    bitmap.eraseColor(Color.WHITE)
                    page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                    bitmap
                }
            }
        }

    private fun <T> withRenderer(pdfData: ByteArray, block: (PdfRenderer) -> T): T {
        val tempFile = File.createTempFile("lexume_pdf_", ".pdf", context.cacheDir)
        try {
            tempFile.writeBytes(pdfData)
            ParcelFileDescriptor.open(tempFile, ParcelFileDescriptor.MODE_READ_ONLY).use { pfd ->
                PdfRenderer(pfd).use { renderer ->
                    return block(renderer)
                }
            }
        } finally {
            tempFile.delete()
        }
    }
}

/** JPEG-encodes a bitmap - used to send rendered PDF pages to Gemini as inline image data. */
fun Bitmap.toJpegBytes(quality: Int = 90): ByteArray {
    val stream = ByteArrayOutputStream()
    compress(Bitmap.CompressFormat.JPEG, quality, stream)
    return stream.toByteArray()
}
