# @ahmedrowaihi/openapi-kotlin

## 1.0.0

### Major Changes

- 26b0224: Full rewrite. Drops Retrofit; the generated SDK is now OkHttp + kotlinx-serialization with a hand-rolled IR → AST → printer pipeline matching the openapi-swift architecture. New surface: per-tag interfaces with `suspend` functions and `*WithResponse` overloads, `OkHttp<Tag>Api` impl class, runtime helpers (`APIClient`, `APIError`, `APIInterceptors`, `Auth`, `MultipartFormBody`, `URLEncoding`, `RequestOptions`), per-call `RequestOptions` (`client` / `baseUrl` / `timeout` / `headers` / `requestInterceptors` / `responseValidator` / `responseTransformer`), per-op security auto-wiring from `securitySchemes`, sealed-class sum-type returns for ops with multiple 2xx schemas, and an optional `gradle:` mode that emits `build.gradle.kts` + `settings.gradle.kts`. Output ships as raw Kotlin source ready to drop into a `src/main/kotlin/` tree, or as a self-contained Gradle module. Everything AST-built; runtime helpers are templated strings. Breaking: every API surface changes.

## 0.1.0

### Minor Changes

- 2af87b7: Initial release. Generates Android Kotlin client SDKs from an OpenAPI 3.x spec — Retrofit interfaces (`@GET`/`@POST`/`@PUT`/`@DELETE`/`@PATCH`), `@Serializable` data classes, suspend functions, multipart/form-urlencoded/binary body dispatch, auto-imports. Walks hey-api IR via `@ahmedrowaihi/openapi-tools/parse`, so 2.0/3.0/3.1 inputs produce the same output.
