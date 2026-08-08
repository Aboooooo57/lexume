package com.aboooooo57.lexume

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.aboooooo57.lexume.navigation.LexumeNavHost
import com.aboooooo57.lexume.ui.theme.LexumeTheme

/**
 * Single-activity host, matching how `RootView`/`NavigationSplitView` is the
 * one entry point on macOS/iPadOS - all real navigation lives in Compose
 * (`LexumeNavHost`), not in additional Activities.
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            LexumeTheme {
                LexumeNavHost()
            }
        }
    }
}
