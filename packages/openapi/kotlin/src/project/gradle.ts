import type { BuiltFile } from "./build.js";

/**
 * `build.gradle.kts` emission for the standalone-library mode.
 *
 * Two consumption modes for the generated SDK:
 *
 *  1. **Drop into an existing Gradle module.** Paste the package
 *     directory (e.g. `com/example/petstore/`) into your module's
 *     `src/main/kotlin/` tree. Make sure the surrounding module already
 *     applies `kotlin("plugin.serialization")` and depends on OkHttp +
 *     kotlinx-serialization-json. This is the default; nothing extra
 *     is emitted.
 *
 *  2. **Standalone Gradle module.** Pass `gradle: true` (or an options
 *     object) to `generate()` and a `build.gradle.kts` is emitted at
 *     the output root with the right plugins + dependencies.
 *
 * Mode 2 is the right choice when the SDK is shared across multiple
 * apps, lives in its own repo, or you want a clean module boundary
 * inside a monorepo.
 */
export interface GradleOptions {
  /** Module group (Gradle's `group =`). Required for publishing; safe
   *  to omit otherwise. */
  group?: string;
  /** Module version. Default: `"0.1.0"`. */
  version?: string;
  /** Kotlin Gradle plugin version. Default: `"2.0.21"`. */
  kotlinVersion?: string;
  /** kotlinx-serialization version. Default: `"1.7.3"`. */
  kotlinxSerializationVersion?: string;
  /** OkHttp version. Default: `"4.12.0"`. */
  okhttpVersion?: string;
  /** kotlinx-coroutines version. Default: `"1.9.0"`. */
  kotlinxCoroutinesVersion?: string;
  /** kotlinx-datetime version (used by `Instant` / `LocalDate` model fields).
   *  Default: `"0.6.1"`. */
  kotlinxDatetimeVersion?: string;
  /** JVM target. Default: `"17"`. */
  jvmTarget?: string;
}

export function buildGradleFile(opts: GradleOptions = {}): BuiltFile {
  const kotlin = opts.kotlinVersion ?? "2.0.21";
  const serialization = opts.kotlinxSerializationVersion ?? "1.7.3";
  const okhttp = opts.okhttpVersion ?? "4.12.0";
  const coroutines = opts.kotlinxCoroutinesVersion ?? "1.9.0";
  const datetime = opts.kotlinxDatetimeVersion ?? "0.6.1";
  const jvmTarget = opts.jvmTarget ?? "17";
  const version = opts.version ?? "0.1.0";
  const groupLine = opts.group ? `group = "${opts.group}"\n` : "";
  return {
    path: "build.gradle.kts",
    content: `plugins {
    kotlin("jvm") version "${kotlin}"
    kotlin("plugin.serialization") version "${kotlin}"
}

${groupLine}version = "${version}"

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:${serialization}")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:${coroutines}")
    implementation("org.jetbrains.kotlinx:kotlinx-datetime:${datetime}")
    implementation("com.squareup.okhttp3:okhttp:${okhttp}")
}

kotlin {
    jvmToolchain(${jvmTarget})
}
`,
  };
}

/**
 * Minimal `settings.gradle.kts` so the directory works as a standalone
 * Gradle build (`gradle build`).
 */
export function settingsGradleFile(name: string): BuiltFile {
  return {
    path: "settings.gradle.kts",
    content: `rootProject.name = "${name}"\n`,
  };
}
