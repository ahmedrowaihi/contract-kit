plugins {
    kotlin("jvm") version "2.0.21"
    kotlin("plugin.serialization") version "2.0.21"
}

kotlin {
    jvmToolchain(17)
    // The generated SDK sits at the project root (com/example/petstore/...)
    // rather than under src/main/kotlin/, so point the source set at the
    // bare directory. Re-running `pnpm gen:kotlin` overwrites this tree
    // freely without touching the gradle files.
    sourceSets["main"].kotlin.srcDir(".")
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.9.0")
    implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.6.1")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
}
