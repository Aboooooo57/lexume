plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    // Applied here, wired up starting M2 when the first @Entity/@Dao lands.
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

    // Room (M2), DataStore (M3), ML Kit/Retrofit/OkHttp (M4/M6), Media3 (M7),
    // Credential Manager/Play Services Auth (M9) are declared in
    // gradle/libs.versions.toml but intentionally not added here yet - each
    // gets wired into this dependencies block in the milestone that first
    // uses it, rather than pulled in unused ahead of time.
}
