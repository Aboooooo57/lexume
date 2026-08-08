package com.aboooooo57.lexume.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * Tracks basic network reachability so the UI can show an offline banner.
 * Cached sessions remain fully readable offline; only network-dependent
 * actions (extraction, TTS, dictionary, translation, Drive sync) are
 * affected. Mirrors `Services/NetworkMonitor.swift`'s `NWPathMonitor`
 * wrapper - same coarse "is there a default network at all" signal, not a
 * captive-portal-aware "is it actually validated internet" check, matching
 * the Swift version's own level of simplicity.
 */
class NetworkMonitor(context: Context) {
    var isOnline by mutableStateOf(true)
        private set

    private val connectivityManager =
        context.applicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager

    private val callback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            isOnline = true
        }

        override fun onLost(network: Network) {
            isOnline = false
        }

        override fun onUnavailable() {
            isOnline = false
        }
    }

    init {
        isOnline = hasActiveNetwork()
        connectivityManager?.registerDefaultNetworkCallback(callback)
        // No unregisterNetworkCallback anywhere - this instance is a single
        // app-wide singleton (LexumeApplication) alive for the whole process,
        // same as NetworkMonitor.swift's own `static let shared` never
        // stopping its NWPathMonitor either.
    }

    private fun hasActiveNetwork(): Boolean {
        val network = connectivityManager?.activeNetwork ?: return false
        return connectivityManager.getNetworkCapabilities(network) != null
    }
}
