# @ahmedrowaihi/oas-core

## 2.0.0

### Major Changes

- 5401075: Renamed `@ahmedrowaihi/oas-core` to `@ahmedrowaihi/openapi-core`; merged `@ahmedrowaihi/aas-core` and `@ahmedrowaihi/asyncapi-tools` into a single `@ahmedrowaihi/asyncapi-core`. Repository layout regrouped under `packages/{shared,openapi,asyncapi}/*`; `asyncapi-typescript` split its internal `lib/` into `runtime/` and `ast/`.

## 1.0.0

### Major Changes

- 16676d9: Extract spec-agnostic primitives (identifier transforms, filesystem safety) into new `@ahmedrowaihi/codegen-core`. `oas-core` no longer re-exports them — consumers must import `pascal`, `camel`, `safeIdent`, `safeCaseName`, `synthName`, `assertSafeOutputDir`, `defaultProjectName` from `@ahmedrowaihi/codegen-core` directly.

### Minor Changes

- 26296d2: Add spec normalization pipeline (`normalizeSpec`) — passes for allOf collapse, inline-enum dedup, structural object dedup (opt-in), and scoped prune. Each generator gains a `normalize?: boolean | NormalizeOptions` option (`true` = safe preset). `sdk-regen` action gains a `normalize` input.

## 0.1.0

### Minor Changes

- c197c34: Extract shared building blocks of the native-SDK generators into a new `@ahmedrowaihi/oas-core` package: `pascal` / `camel` / `safeIdent` / `safeCaseName` / `synthName` identifier transforms, `refName` / `isMeaningless`, `extractSecuritySchemeNames` walker + `securityKey`, HTTP / media-type constants (`HTTP_METHODS`, `HTTP_METHOD_LITERAL`, `JSON_MEDIA_RE`, `MULTIPART_FORM_MEDIA`, `FORM_URLENCODED_MEDIA`), and `assertSafeOutputDir` / `defaultProjectName`. The three SDK generators now consume those from `oas-core` instead of byte-duplicating them. No public-API changes for the generators — `securityKey` is no longer re-exported from each generator's IR module since it lives in `oas-core` directly; consumers who imported it should switch to `import { securityKey } from "@ahmedrowaihi/oas-core"`.
