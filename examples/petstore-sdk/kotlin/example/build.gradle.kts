plugins {
    kotlin("jvm") version "2.0.21"
    application
}

kotlin {
    jvmToolchain(17)
}

dependencies {
    implementation(project(":sdk"))
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.9.0")
}

application {
    mainClass.set("com.example.petstoreapp.MainKt")
}
