package com.aboooooo57.lexume.data.local

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.SecretKey as CryptoSecretKey

private val Context.secureDataStore by preferencesDataStore(name = "lexume_secrets")

/** Mirrors macOS's `Services/KeychainStore.swift`'s `SecretKey` enum. */
enum class SecretKey(val storageKey: String) {
    GEMINI_API_KEY("gemini_api_key"),
    ELEVENLABS_API_KEY("elevenlabs_api_key"),
    DRIVE_REFRESH_TOKEN("drive_refresh_token")
}

/**
 * Android analog of macOS's `Services/KeychainStore.swift` - Gemini/
 * ElevenLabs (and, from M9, the Drive refresh token) secrets, encrypted with
 * an Android Keystore-backed AES-256-GCM key (hardware-backed on most
 * devices, and the key material itself never leaves the Keystore) before
 * being written to DataStore. Deliberately hand-rolled with the standard
 * `javax.crypto`/`android.security.keystore` APIs rather than adding Tink as
 * a dependency - same security properties (authenticated encryption, a
 * Keystore-resident key), smaller and more auditable surface for a 3-secret
 * store. Not `EncryptedSharedPreferences` (deprecated as of
 * `androidx.security:security-crypto` 1.1.0-alpha07) and not plain DataStore
 * (unencrypted) - see the plan's tech-stack notes for the full reasoning.
 */
class SecureKeyStore(private val context: Context) {
    private val keyStore: KeyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }

    suspend fun get(key: SecretKey): String? {
        val prefs = context.secureDataStore.data.first()
        val encoded = prefs[stringPreferencesKey(key.storageKey)] ?: return null
        return try {
            decrypt(encoded)
        } catch (e: Exception) {
            // The Keystore key can go invalid (device credentials reset,
            // restore to different hardware, etc.) - every exception class
            // that can throw here (BadPaddingException, KeyPermanently-
            // InvalidatedException, IllegalArgumentException from a
            // corrupted Base64 blob, ...) means the same thing to the
            // caller: treat it as "no key saved," matching
            // KeychainStore.get's optional return, rather than crashing.
            null
        }
    }

    suspend fun set(value: String, key: SecretKey) {
        val trimmed = value.trim()
        if (trimmed.isEmpty()) {
            delete(key)
            return
        }
        val encoded = encrypt(trimmed)
        context.secureDataStore.edit { it[stringPreferencesKey(key.storageKey)] = encoded }
    }

    suspend fun delete(key: SecretKey) {
        context.secureDataStore.edit { it.remove(stringPreferencesKey(key.storageKey)) }
    }

    private fun encrypt(plainText: String): String {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())
        // GCM's IV is always 12 bytes for this cipher; prefix it onto the
        // ciphertext so decrypt() can recover it without a second field.
        val combined = cipher.iv + cipher.doFinal(plainText.toByteArray(Charsets.UTF_8))
        return Base64.encodeToString(combined, Base64.NO_WRAP)
    }

    private fun decrypt(encoded: String): String {
        val combined = Base64.decode(encoded, Base64.NO_WRAP)
        val iv = combined.copyOfRange(0, GCM_IV_LENGTH_BYTES)
        val cipherText = combined.copyOfRange(GCM_IV_LENGTH_BYTES, combined.size)
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv))
        return String(cipher.doFinal(cipherText), Charsets.UTF_8)
    }

    private fun getOrCreateKey(): CryptoSecretKey {
        (keyStore.getKey(KEY_ALIAS, null) as? CryptoSecretKey)?.let { return it }
        val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
        val spec = KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .build()
        keyGenerator.init(spec)
        return keyGenerator.generateKey()
    }

    private companion object {
        const val ANDROID_KEYSTORE = "AndroidKeyStore"
        const val KEY_ALIAS = "lexume_secrets_key"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
        const val GCM_IV_LENGTH_BYTES = 12
        const val GCM_TAG_LENGTH_BITS = 128
    }
}
