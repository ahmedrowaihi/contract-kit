# @ahmedrowaihi/openapi-go

## 0.2.1

### Patch Changes

- 5401075: Renamed `@ahmedrowaihi/oas-core` to `@ahmedrowaihi/openapi-core`; merged `@ahmedrowaihi/aas-core` and `@ahmedrowaihi/asyncapi-tools` into a single `@ahmedrowaihi/asyncapi-core`. Repository layout regrouped under `packages/{shared,openapi,asyncapi}/*`; `asyncapi-typescript` split its internal `lib/` into `runtime/` and `ast/`.
- Updated dependencies [5401075]
  - @ahmedrowaihi/openapi-core@2.0.0
  - @ahmedrowaihi/codegen-core@0.2.1
  - @ahmedrowaihi/openapi-tools@1.2.1

## 0.2.0

### Minor Changes

- 26296d2: Add spec normalization pipeline (`normalizeSpec`) — passes for allOf collapse, inline-enum dedup, structural object dedup (opt-in), and scoped prune. Each generator gains a `normalize?: boolean | NormalizeOptions` option (`true` = safe preset). `sdk-regen` action gains a `normalize` input.

### Patch Changes

- 16676d9: Extract spec-agnostic primitives (identifier transforms, filesystem safety) into new `@ahmedrowaihi/codegen-core`. `oas-core` no longer re-exports them — consumers must import `pascal`, `camel`, `safeIdent`, `safeCaseName`, `synthName`, `assertSafeOutputDir`, `defaultProjectName` from `@ahmedrowaihi/codegen-core` directly.
- Updated dependencies [16676d9]
- Updated dependencies [26296d2]
  - @ahmedrowaihi/codegen-core@0.2.0
  - @ahmedrowaihi/oas-core@1.0.0

## 0.1.1

### Patch Changes

- c197c34: Extract shared building blocks of the native-SDK generators into a new `@ahmedrowaihi/oas-core` package: `pascal` / `camel` / `safeIdent` / `safeCaseName` / `synthName` identifier transforms, `refName` / `isMeaningless`, `extractSecuritySchemeNames` walker + `securityKey`, HTTP / media-type constants (`HTTP_METHODS`, `HTTP_METHOD_LITERAL`, `JSON_MEDIA_RE`, `MULTIPART_FORM_MEDIA`, `FORM_URLENCODED_MEDIA`), and `assertSafeOutputDir` / `defaultProjectName`. The three SDK generators now consume those from `oas-core` instead of byte-duplicating them. No public-API changes for the generators — `securityKey` is no longer re-exported from each generator's IR module since it lives in `oas-core` directly; consumers who imported it should switch to `import { securityKey } from "@ahmedrowaihi/oas-core"`.
- Updated dependencies [c197c34]
  - @ahmedrowaihi/oas-core@0.1.0

## 0.1.0

### Minor Changes

- e337c9f: Initial release. Generates idiomatic Go client SDKs from an OpenAPI 3.x spec: per-tag interfaces with `context.Context` first-arg + `*WithResponse` companions, `NetHTTP<Tag>API` impl structs, structs / typed-string enums / type aliases for schemas, sealed-style sum types (interface + concrete cases) for ops with multiple 2xx schemas, and runtime helpers (`APIClient`, `APIError`, `Auth`, `MultipartFormBody`, `URLEncoding`, `RequestOptions`). Per-call options cover `Client` / `BaseURL` / `Timeout` / `Headers` / `RequestInterceptors` / `ResponseValidator` / `ResponseTransformer`; per-op security from `securitySchemes` is auto-applied via a `client.Auth` map. Output ships as raw `.go` files (drop into an existing module) or as a self-contained Go module when `gomod: { module: ... }` is passed. Stdlib only — `net/http` + `encoding/json` + `mime/multipart` — zero third-party dependencies. Reuses the same hey-api IR pipeline as `@ahmedrowaihi/openapi-kotlin` and `@ahmedrowaihi/openapi-swift`. Everything AST-built; runtime helpers are templated strings.

### Patch Changes

- e337c9f: Fix two gaps surfaced by real-world specs (Mux API):

  - **PHP-style array param names** (`timeframe[]`): `pascal()` now strips trailing non-alphanumeric characters so identifiers like `timeframe[]` produce `Timeframe` instead of leaking the brackets into the generated source. Wire-level query keys are unaffected (the impl still emits the original `timeframe[]` for the URL).
  - **Integer-valued enum schemas** (`enum: [0, 90, 180, 270]`): previously rejected with a thrown error.
    - Go: emits `type Foo int` + a typed-const block (e.g. `Rotate90 Rotate = 90`).
    - Swift: emits `enum Foo: Int, Codable { case _0 = 0; case _90 = 90 }`.
    - Kotlin: degrades to `typealias Foo = Int` — kotlinx-serialization's enum support only round-trips string raw values via `@SerialName`; the typealias preserves the wire type without forcing a custom `KSerializer`.
    - Mixed string + integer enums throw with a clear "must all be strings or all integers" message.
