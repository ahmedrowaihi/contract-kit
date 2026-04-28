# @ahmedrowaihi/openapi-kotlin

## 0.1.0

### Minor Changes

- 2af87b7: Initial release. Generates Android Kotlin client SDKs from an OpenAPI 3.x spec — Retrofit interfaces (`@GET`/`@POST`/`@PUT`/`@DELETE`/`@PATCH`), `@Serializable` data classes, suspend functions, multipart/form-urlencoded/binary body dispatch, auto-imports. Walks hey-api IR via `@ahmedrowaihi/openapi-tools/parse`, so 2.0/3.0/3.1 inputs produce the same output.
