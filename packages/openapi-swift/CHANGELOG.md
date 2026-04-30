# @ahmedrowaihi/openapi-swift

## 0.1.2

### Patch Changes

- c197c34: Extract shared building blocks of the native-SDK generators into a new `@ahmedrowaihi/oas-core` package: `pascal` / `camel` / `safeIdent` / `safeCaseName` / `synthName` identifier transforms, `refName` / `isMeaningless`, `extractSecuritySchemeNames` walker + `securityKey`, HTTP / media-type constants (`HTTP_METHODS`, `HTTP_METHOD_LITERAL`, `JSON_MEDIA_RE`, `MULTIPART_FORM_MEDIA`, `FORM_URLENCODED_MEDIA`), and `assertSafeOutputDir` / `defaultProjectName`. The three SDK generators now consume those from `oas-core` instead of byte-duplicating them. No public-API changes for the generators — `securityKey` is no longer re-exported from each generator's IR module since it lives in `oas-core` directly; consumers who imported it should switch to `import { securityKey } from "@ahmedrowaihi/oas-core"`.
- Updated dependencies [c197c34]
  - @ahmedrowaihi/oas-core@0.1.0

## 0.1.1

### Patch Changes

- e337c9f: Fix two gaps surfaced by real-world specs (Mux API):

  - **PHP-style array param names** (`timeframe[]`): `pascal()` now strips trailing non-alphanumeric characters so identifiers like `timeframe[]` produce `Timeframe` instead of leaking the brackets into the generated source. Wire-level query keys are unaffected (the impl still emits the original `timeframe[]` for the URL).
  - **Integer-valued enum schemas** (`enum: [0, 90, 180, 270]`): previously rejected with a thrown error.
    - Go: emits `type Foo int` + a typed-const block (e.g. `Rotate90 Rotate = 90`).
    - Swift: emits `enum Foo: Int, Codable { case _0 = 0; case _90 = 90 }`.
    - Kotlin: degrades to `typealias Foo = Int` — kotlinx-serialization's enum support only round-trips string raw values via `@SerialName`; the typealias preserves the wire type without forcing a custom `KSerializer`.
    - Mixed string + integer enums throw with a clear "must all be strings or all integers" message.

## 0.1.0

### Minor Changes

- f798a95: Initial release. Generates iOS Swift client SDKs from an OpenAPI 3.x spec: protocols (one per tag) + `URLSession<Tag>API` default impl, `Codable` structs/enums with format-aware Foundation types, sum-type return for ops with multiple 2xx schemas, and runtime helpers (`APIClient`, `APIError`, `APIInterceptors`, `Auth`, `MultipartFormBody`, `URLEncoding`, `RequestOptions`). Per-call options cover `client` / `baseURL` / `timeout` / `headers` / `requestInterceptors` / `responseValidator` / `responseTransformer`; per-op security from `securitySchemes` is auto-applied via a `client.auth` bag. Every operation also emits a `*WithResponse` overload returning `(T, HTTPURLResponse)` for callers that need response headers. Output ships as raw files (drop into an Xcode target) or as a self-contained SwiftPM library when `package: { name }` is passed. Reuses the same hey-api IR pipeline as `@ahmedrowaihi/openapi-kotlin`. Everything AST-built, no string templating.
