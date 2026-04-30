# @ahmedrowaihi/openapi-kotlin

## 1.0.2

### Patch Changes

- c197c34: Extract shared building blocks of the native-SDK generators into a new `@ahmedrowaihi/oas-core` package: `pascal` / `camel` / `safeIdent` / `safeCaseName` / `synthName` identifier transforms, `refName` / `isMeaningless`, `extractSecuritySchemeNames` walker + `securityKey`, HTTP / media-type constants (`HTTP_METHODS`, `HTTP_METHOD_LITERAL`, `JSON_MEDIA_RE`, `MULTIPART_FORM_MEDIA`, `FORM_URLENCODED_MEDIA`), and `assertSafeOutputDir` / `defaultProjectName`. The three SDK generators now consume those from `oas-core` instead of byte-duplicating them. No public-API changes for the generators — `securityKey` is no longer re-exported from each generator's IR module since it lives in `oas-core` directly; consumers who imported it should switch to `import { securityKey } from "@ahmedrowaihi/oas-core"`.
- Updated dependencies [c197c34]
  - @ahmedrowaihi/oas-core@0.1.0

## 1.0.1

### Patch Changes

- e337c9f: Fix two gaps surfaced by real-world specs (Mux API):

  - **PHP-style array param names** (`timeframe[]`): `pascal()` now strips trailing non-alphanumeric characters so identifiers like `timeframe[]` produce `Timeframe` instead of leaking the brackets into the generated source. Wire-level query keys are unaffected (the impl still emits the original `timeframe[]` for the URL).
  - **Integer-valued enum schemas** (`enum: [0, 90, 180, 270]`): previously rejected with a thrown error.
    - Go: emits `type Foo int` + a typed-const block (e.g. `Rotate90 Rotate = 90`).
    - Swift: emits `enum Foo: Int, Codable { case _0 = 0; case _90 = 90 }`.
    - Kotlin: degrades to `typealias Foo = Int` — kotlinx-serialization's enum support only round-trips string raw values via `@SerialName`; the typealias preserves the wire type without forcing a custom `KSerializer`.
    - Mixed string + integer enums throw with a clear "must all be strings or all integers" message.

## 1.0.0

### Major Changes

- 26b0224: Full rewrite. Drops Retrofit; the generated SDK is now OkHttp + kotlinx-serialization with a hand-rolled IR → AST → printer pipeline matching the openapi-swift architecture. New surface: per-tag interfaces with `suspend` functions and `*WithResponse` overloads, `OkHttp<Tag>Api` impl class, runtime helpers (`APIClient`, `APIError`, `APIInterceptors`, `Auth`, `MultipartFormBody`, `URLEncoding`, `RequestOptions`), per-call `RequestOptions` (`client` / `baseUrl` / `timeout` / `headers` / `requestInterceptors` / `responseValidator` / `responseTransformer`), per-op security auto-wiring from `securitySchemes`, sealed-class sum-type returns for ops with multiple 2xx schemas, and an optional `gradle:` mode that emits `build.gradle.kts` + `settings.gradle.kts`. Output ships as raw Kotlin source ready to drop into a `src/main/kotlin/` tree, or as a self-contained Gradle module. Everything AST-built; runtime helpers are templated strings. Breaking: every API surface changes.

## 0.1.0

### Minor Changes

- 2af87b7: Initial release. Generates Android Kotlin client SDKs from an OpenAPI 3.x spec — Retrofit interfaces (`@GET`/`@POST`/`@PUT`/`@DELETE`/`@PATCH`), `@Serializable` data classes, suspend functions, multipart/form-urlencoded/binary body dispatch, auto-imports. Walks hey-api IR via `@ahmedrowaihi/openapi-tools/parse`, so 2.0/3.0/3.1 inputs produce the same output.
