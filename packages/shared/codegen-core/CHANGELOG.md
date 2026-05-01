# @ahmedrowaihi/codegen-core

## 0.2.1

### Patch Changes

- 5401075: Renamed `@ahmedrowaihi/oas-core` to `@ahmedrowaihi/openapi-core`; merged `@ahmedrowaihi/aas-core` and `@ahmedrowaihi/asyncapi-tools` into a single `@ahmedrowaihi/asyncapi-core`. Repository layout regrouped under `packages/{shared,openapi,asyncapi}/*`; `asyncapi-typescript` split its internal `lib/` into `runtime/` and `ast/`.

## 0.2.0

### Minor Changes

- 16676d9: Extract spec-agnostic primitives (identifier transforms, filesystem safety) into new `@ahmedrowaihi/codegen-core`. `oas-core` no longer re-exports them — consumers must import `pascal`, `camel`, `safeIdent`, `safeCaseName`, `synthName`, `assertSafeOutputDir`, `defaultProjectName` from `@ahmedrowaihi/codegen-core` directly.
