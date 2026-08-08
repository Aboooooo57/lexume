pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

plugins {
    // Lets Gradle auto-download a matching JDK when `kotlin { jvmToolchain(17) }`
    // (app/build.gradle.kts) can't find one already installed - without this,
    // a machine with only e.g. JDK 21/25 installed fails with "Cannot find a
    // Java installation... Toolchain download repositories have not been
    // configured" instead of just fetching one.
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "Lexume"
include(":app")
