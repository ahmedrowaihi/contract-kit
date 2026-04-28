# Native client codegen — Kotlin & Swift

Two new packages that turn an OpenAPI 3.x spec into idiomatic Android (Kotlin) and iOS (Swift) client SDKs. Closes the gap where backends + web are spec-driven but mobile clients are still hand-written.

## Why

- Backends (TS / Go / TypeSpec) and web (`openapi-ts`, Orval) are already generated from specs.
- Android and iOS hand-write Retrofit interfaces and Swift API protocols that drift from the spec.
- Existing tools — `openapi-generator` (Kotlin), `swift-openapi-generator` (Swift) — produce verbose, framework-heavy output. Differentiator: idiomatic, minimal, drop-in.

## Stack reality (target: Thmanyah `podcast-android` + `podcast-ios`)

| Side | Stack |
|------|-------|
| Android | Retrofit 2.9 + kotlinx-serialization 1.5 + suspend + Hilt; files like `XxxRemoteDS.kt` |
| iOS | URLSession-backed internal `CoreNetwork` module; 3-layer (Protocol / Service enum / Implementation); `async throws -> XxxDTO?` |

Generated output should match this shape so adoption is drop-in (no rewrite of `RemoteDataSource` wiring on Android, no migration of `CoreNetwork` on iOS).

## Architecture

Two standalone packages, each mirroring `@hey-api/openapi-python`:

```
@ahmedrowaihi/openapi-kotlin
@ahmedrowaihi/openapi-swift
```

Reuse and split:

- **Build per language** — minimal DSL (AST types) + printer (AST → source string) + project builder (decls → files, with import resolution). Modeled on hey-api's `py-dsl/` + `py-compiler/` shape.
- **Reuse `@ahmedrowaihi/openapi-tools`** — `parse` + `ir` for spec ingestion. Avoids re-implementing schema walking.

> **`@hey-api/codegen-core` evaluated and not used for now.** It supports `'kotlin' | 'swift'` as first-class languages and offers `Project`/`File`/`Symbol`/`Ref` with name-conflict resolution. But Kotlin's import system is flat (one type → one file → one import line), so the bridge cost (mapping `KtDecl` to codegen-core's `Node`/`Symbol` registry) is significantly higher than just walking the AST. Revisit when Swift lands — if both packages reach for the same logic, extract a shared base, then maybe migrate both to codegen-core.

Per-package layout:

```
packages/openapi-kotlin/src/
├── index.ts          # public API: generate({input, output, plugins})
├── cli/run.ts        # bin entry
├── config/types.ts   # config schema
├── kt-dsl/
│   ├── decl/         # class.ts, dataClass.ts, interface.ts, fun.ts, prop.ts, param.ts
│   ├── expr/         # ref.ts, lit.ts, call.ts
│   ├── layout/       # file.ts, importStmt.ts, packageStmt.ts
│   └── annotation.ts
├── kt-compiler/
│   └── printer.ts    # AST walker → string (registered as codegen-core Renderer)
├── nodes/            # codegen-core Node adapters
├── plugins/
│   ├── kotlinx-serialization/   # @Serializable data classes from schemas
│   └── retrofit/                # interfaces from operations
└── ir-to-kt.ts       # OpenAPI IR → kt-dsl
```

Same structure for `openapi-swift` (`sw-dsl`, `sw-compiler`, `urlsession`, `codable` plugins).

## Pre-flight checks (done)

- [x] codegen-core has `'kotlin' | 'swift'` in its `Language` union — multi-language is first-class.
- [x] `Renderer` interface is minimal (`render(ctx) → string`, `supports(ctx) → boolean`) — fits a custom AST printer trivially.
- [x] Public exports include `Project`, `File`, `Symbol`, `Ref`, conflict resolvers, module entry name config.
- [x] Thmanyah already publishes private SDKs to GitHub Packages (`subscription-sdk-android`) — distribution muscle exists.

## Locked decisions

- Two packages, not one `openapi-mobile`. Independent versioning, smaller installs, matches `openapi-python` precedent.
- **Kotlin runtime:** Retrofit 2.9 + kotlinx-serialization + suspend. Aligned with Thmanyah.
- **Swift runtime:** URLSession + Codable + async throws, zero runtime deps. Cleaner than Thmanyah's internal `CoreNetwork` module so output is portable.
- **File grouping:** by tag (matches Thmanyah's Retrofit `XxxRemoteDS` and iOS `XxxAPI/`).
- **Nullability:** drive from spec (`required` / `nullable`). No blanket-optional output.
- **Distribution model:** backend commits emitted `sdk/android/`, `sdk/ios/` directories. Registry publishing later if needed.

## Phase 1 — `@ahmedrowaihi/openapi-kotlin`

Kotlin first because Retrofit codegen is the most predictable target and Android tooling is the most underserved.

| # | Milestone | Definition of done |
|---|-----------|---------------------|
| M1 | DSL + printer | Hand-built AST emits `@Serializable data class User(val id: String, val name: String?)`. Snapshot test passes. |
| M2 | Schemas → data classes | OpenAPI schema fragment → emitted data class. Handles primitives, nullable, arrays, refs, nested objects, enums. |
| M3 | Operations → Retrofit interfaces | Paths/operations → interfaces grouped by tag. `@GET / @POST / @PUT / @DELETE / @PATCH`, `@Path`, `@Query`, `@Body`. Suspend funs. Correct return types incl. `Response<T>` opt-in. |
| M4 | codegen-core integration | Cross-file refs auto-import; one file per type, one per interface; `package` configurable. |
| M5 | Real-spec test | Run against Thmanyah `podcast` backend's OpenAPI. Diff output against hand-written `UserProfileRemoteDS.kt`. Close gaps. |
| M6 | Output mode | Tree under `output/` drops into `app/src/main/java/<pkg>/api/`. `XxxApi.kt` (interfaces) + `XxxModel.kt` (DTOs). |
| M7 | Publish | Changeset, README, npm publish. |

## Phase 2 — `@ahmedrowaihi/openapi-swift`

Same shape, same milestones M1–M7. Generated output:

- `Codable` structs with `let` properties, optional unwrap matching spec.
- `actor`-based or `struct`-based API client with `URLSession.shared.data(for:)` + `JSONDecoder`.
- `async throws` functions returning `T` (not `T?`) unless schema says otherwise.

## Open questions

1. **Kotlin response wrapping** — emit raw return types (`UserDto`), or `Response<T>` (Retrofit), or custom `Result<T, ApiError>`? Default to raw + spec-driven nullability; offer config flag for `Response<T>` opt-in.
2. **Swift error model** — typed `throws` (Swift 6) or untyped `throws`? Untyped to keep Swift 5.9+ compatibility; revisit when Thmanyah moves to Swift 6.
3. **Auth / interceptors** — leave to consumer (Retrofit `OkHttpClient` interceptors / URLSession `URLProtocol`)? Or generate hooks? Default: generate nothing; consumer wires up.
4. **Deprecation handling** — `@Deprecated(...)` + `@available(*, deprecated)` from spec `deprecated: true`. Easy win, do early.

## Deferred (not in M1–M7)

- Watch mode.
- Gradle `build.gradle.kts` / `Package.swift` scaffolding emit.
- GitHub Packages / SPM publish helper.
- Multiplatform Kotlin (Ktor client) variant.
- AAR / XCFramework binary artifacts.
