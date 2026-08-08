package com.aboooooo57.lexume.ui.reader

import android.content.Context
import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import com.aboooooo57.lexume.data.model.TokenMap
import java.io.File
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers

/**
 * Drives audio playback and the karaoke tick loop - the Android analog of
 * `Reader/PlaybackEngine.swift`, using Media3's [ExoPlayer] in place of
 * `AVAudioPlayer`. A ~50ms coroutine loop (in place of Swift's `Timer`)
 * samples playback position (with a 100ms lookahead, matching the web app's
 * perceived-lag compensation, ported unchanged) and resolves the active
 * word via [TokenMap].
 */
class PlaybackEngine(context: Context) {
    var isPlaying by mutableStateOf(false)
        private set
    var currentTime by mutableStateOf(0.0)
        private set
    var duration by mutableStateOf(0.0)
        private set
    var activeTokenIndex by mutableStateOf<Int?>(null)
        private set

    /** Called when the track finishes playing (drives auto-advance to the next page). */
    var onFinished: (() -> Unit)? = null

    /** Called at most every ~15s (plus on pause) with the position to persist for resume. */
    var onPersistPosition: ((Double) -> Unit)? = null

    private val appContext = context.applicationContext
    private val player: ExoPlayer = ExoPlayer.Builder(appContext).build()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var tokenMap: TokenMap? = null
    private var tickJob: Job? = null
    private var lastPersistTimeMs = 0L
    private var tempAudioFile: File? = null

    init {
        player.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                when (playbackState) {
                    Player.STATE_READY -> {
                        val durationMs = player.duration
                        if (durationMs != C.TIME_UNSET) {
                            duration = durationMs / 1000.0
                        }
                    }
                    Player.STATE_ENDED -> {
                        isPlaying = false
                        stopTicking()
                        currentTime = 0.0
                        persistPositionNow()
                        onFinished?.invoke()
                    }
                }
            }
        })
    }

    fun load(audioData: ByteArray, tokenMap: TokenMap, resumeAt: Double?) {
        stop()
        val file = File.createTempFile("lexume_audio_", ".mp3", appContext.cacheDir)
        file.writeBytes(audioData)
        tempAudioFile = file
        this.tokenMap = tokenMap

        player.setMediaItem(MediaItem.fromUri(Uri.fromFile(file)))
        player.prepare()

        if (resumeAt != null && resumeAt > 0) {
            player.seekTo((resumeAt * 1000).toLong())
            currentTime = resumeAt
        } else {
            currentTime = 0.0
        }
        updateActiveToken()
    }

    fun play() {
        player.play()
        isPlaying = true
        startTicking()
    }

    fun pause() {
        player.pause()
        isPlaying = false
        stopTicking()
        persistPositionNow()
    }

    fun toggle() {
        if (isPlaying) pause() else play()
    }

    fun restart() {
        player.seekTo(0)
        currentTime = 0.0
        updateActiveToken()
        if (!isPlaying) play()
    }

    fun seek(time: Double) {
        val clamped = time.coerceIn(0.0, duration)
        player.seekTo((clamped * 1000).toLong())
        currentTime = clamped
        updateActiveToken()
    }

    fun skip(seconds: Double) = seek(currentTime + seconds)

    /** Jumps playback to the start of a specific token - used when the user taps a word while audio is loaded. */
    fun seekToToken(index: Int) {
        val timing = tokenMap?.timing(index) ?: return
        seek(timing.start)
    }

    fun stop() {
        stopTicking()
        player.stop()
        player.clearMediaItems()
        tempAudioFile?.delete()
        tempAudioFile = null
        isPlaying = false
        currentTime = 0.0
        duration = 0.0
        activeTokenIndex = null
        tokenMap = null
    }

    /** Releases the underlying ExoPlayer - call once, when the owning screen is torn down. */
    fun release() {
        stop()
        player.release()
    }

    private fun startTicking() {
        stopTicking()
        tickJob = scope.launch {
            while (isActive) {
                delay(50)
                tick()
            }
        }
    }

    private fun stopTicking() {
        tickJob?.cancel()
        tickJob = null
    }

    private fun tick() {
        currentTime = player.currentPosition / 1000.0
        updateActiveToken()
        maybePersistPosition()
    }

    private fun updateActiveToken() {
        val map = tokenMap
        if (map == null) {
            activeTokenIndex = null
            return
        }
        val lookahead = currentTime + 0.10
        activeTokenIndex = map.activeTokenIndex(lookahead, activeTokenIndex)
    }

    private fun maybePersistPosition() {
        val now = System.currentTimeMillis()
        if (now - lastPersistTimeMs < 15_000) return
        persistPositionNow()
    }

    /** Persists the exact current position immediately (bypasses the ~15s throttle) - used on page/screen close. */
    fun persistPositionNow() {
        lastPersistTimeMs = System.currentTimeMillis()
        onPersistPosition?.invoke(currentTime)
    }
}
