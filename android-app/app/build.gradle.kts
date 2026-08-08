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

    // DataStore (M3), ML Kit/Retrofit/OkHttp (M4/M6), Media3 (M7), Credential
    // Manager/Play Services Auth (M9) are declared in gradle/libs.versions.toml
    // but intentionally not added here yet - each gets wired into this
    // dependencies block in the milestone that first uses it, rather than
    // pulled in unused ahead of time.
}
