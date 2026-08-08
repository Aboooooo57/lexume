plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    // Room's annotation processor (M2) runs through this.
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.aboooooo57.lexume"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.aboooooo57.lexume"
        // Covers the large majority of active devices while still allowing
        // modern APIs (Credential Manager, current ML Kit) - matches the
        // plan's stack notes.
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
    }
}

ksp {
    // Room writes its generated schema JSON here each build - not consumed
    // by anything yet, but is the standard basis for Room's own migration
    // tests once this project has more than one schema version.
    arg("room.schemaLocation", "$projectDir/schemas")
}

kotlin {
    // Pins Kotlin's compile target to 17, matching android.compileOptions
    // above. Without this, the Kotlin Gradle Plugin infers its target JVM
    // from whichever JDK the Gradle daemon itself runs on (21, after
    // pointing Gradle JVM at a JDK <=24 to fix the earlier Gradle-9
    // incompatibility) - which then disagreed with Java's target 17 and
    // failed compileDebugKotlin with "Inconsistent JVM-target compatibility."
    // jvmToolchain also means Gradle will provision/select a JDK 17 toolchain
    // for the Kotlin compiler specifically, independent of whatever JDK runs
    // Gradle itself.
    jvmToolchain(17)
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.material.icons.extended)
    implementation(libs.androidx.navigation.compose)
    debugImplementation(libs.androidx.ui.tooling)

    implementation(libs.kotlinx.coroutines.android)

    // Room (M2) - the data layer. room-ktx adds Flow/suspend-fun support to
    // the DAOs in data/local/dao/; room-compiler is a KSP annotation
    // processor, not a runtime dependency, hence `ksp(...)` not `implementation(...)`.
    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    ksp(libs.androidx.room.compiler)

    // DataStore (M3) - non-secret settings (AppPreferences) and, combined
    // with Android Keystore-backed encryption, the Gemini/ElevenLabs key
    // store (SecureKeyStore). No Tink dependency - see SecureKeyStore.kt's
    // doc comment for why.
    implementation(libs.androidx.datastore.preferences)

    // Import & extraction (M4). ML Kit is the on-device OCR fallback when no
    // Gemini key is set (LocalExtractionService/MlKitOcrService); OkHttp
    // (network/HttpClients.kt's shared client) backs every hand-built REST
    // call (Gemini, and now M6's dictionary/translate clients) - KeyValidator's
    // simple GETs stay on plain HttpURLConnection, no need to migrate those.
    implementation(libs.mlkit.text.recognition)
    implementation(libs.okhttp)

    // Dictionary & translation (M6). ML Kit's Language Identification picks
    // which locale to speak a word in for the on-device TextToSpeech
    // pronunciation fallback (network/PronunciationService.kt) - the Android
    // analog of DictionaryViewModel.swift's NLLanguageRecognizer-driven
    // voice pick. Retrofit still isn't wired in - every REST call so far
    // (Gemini, dictionaryapi.dev, Google Translate's gtx endpoint) builds
    // its own request/parses its own response by hand, so there's still no
    // typed interface for Retrofit to generate.
    implementation(libs.mlkit.language.id)

    // Narration (M7). Media3's ExoPlayer plays ElevenLabs' MP3 output
    // (ui/reader/PlaybackEngine.kt) - a real player was worth the
    // dependency over android.media.MediaPlayer (already used for the
    // dictionary's one-off pronunciation-clip playback, M6) once seeking,
    // position polling, and playback-state callbacks all matter together.
    implementation(libs.androidx.media3.exoplayer)
    implementation(libs.androidx.media3.common)

    // Credential Manager/Play Services Auth (M9) are declared in
    // gradle/libs.versions.toml but intentionally not added here yet - each
    // gets wired into this dependencies block in the milestone that first
    // uses it, rather than pulled in unused ahead of time.
}
