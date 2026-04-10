# Changelog

All notable changes to `@ahmedrowaihi/openapi-ts-orpc` are documented here.

## [2.1.4](https://github.com/ahmedrowaihi/openapi-ts-orpc-plugin/releases/tag/v2.1.4) — Multipart Field-Level Patching

### Fixed

- **Multipart form bodies no longer collapsed into a single `z.file()`** — Previously, `multipart/form-data` bodies with named fields (e.g. `{ file, title, description }`) were replaced entirely with `z.file()`, losing field names and causing oRPC to send a raw file instead of proper FormData. Now only individual `format: "binary"` properties are patched to `z.file()` while the object wrapper and other fields are preserved.

### Changed

- **`BodyKind` union replaces boolean flags** — `classifyBody()` returns `"json" | "raw-file" | "multipart" | "other"` instead of passing `bodyIsRawFile` + `bodyIsMultipart` booleans through the call chain.
- **Cleaner `contract-validator.ts` structure** — Refactored into clear sections: public API, `createRequestSchema` wrapper, file schema helpers, and two focused patching strategies (`patchRawFileBody`, `patchMultipartBody`).
- **Added multipart example** — Local Petstore spec with a `POST /pet/{petId}/uploadDocument` endpoint using `multipart/form-data` with file + metadata fields.

## [2.1.3](https://github.com/ahmedrowaihi/openapi-ts-orpc-plugin/releases/tag/v2.1.3) — Multipart/File Upload Support

### Added

- **File body detection** — Operations with `application/octet-stream` or `multipart/form-data` body types are now recognized and handled correctly.
- **Validator-aware file schemas** — The correct file schema is emitted based on your validator and version:
  | Validator | Version | Generated | Import |
  |---|---|---|---|
  | Zod | v4 | `z.file()` | `zod` (native) |
  | Zod | v3 / mini | `oz.file()` | `@orpc/zod` |
  | Valibot | any | `v.file()` | `valibot` (native) |
- **`createRequestSchema` integration** (hey-api v0.95+) — Non-body layers (params, query, headers) come from the validator plugin and the body is overridden with the file schema via `.extend()`, giving full detailed-mode validation.
- **Fallback for older hey-api** (v0.92) — Emits the file schema in compact mode; path/query params are still enforced by oRPC's route definition.
- `@orpc/zod` added as optional peer dependency (only needed for Zod v3).

### Changed

- `symbols/external.ts` — Removed eager `oz` registration; file symbols are now resolved on-demand via `plugin.external()` only when the operation has a file body.

## [2.1.2](https://github.com/ahmedrowaihi/openapi-ts-orpc-plugin/releases/tag/v2.1.2)

Patch release — formatting and minor internal cleanup.

## [2.1.1](https://github.com/ahmedrowaihi/openapi-ts-orpc-plugin/releases/tag/v2.1.1) — Detailed Mode Params Fix

### Fixed

- **oRPC detailed mode: `path` → `params`** — In detailed mode, oRPC expects path parameters under the `params` key, but hey-api's `createRequestSchema` uses `path` by default. Path parameters were silently ignored at runtime. Fixed by using the `as` option to rename the output key.

## [2.1.0](https://github.com/ahmedrowaihi/openapi-ts-orpc-plugin/releases/tag/v2.1.0) — Shared Faker Core

### Changed

- Faker logic is now imported from `@ahmedrowaihi/openapi-ts-faker/core` instead of being duplicated. Single source of truth for field hints (76 entries), format mapping, type compatibility checking, and AST builders. `generators/faker.ts` went from 230 lines to 65 lines.
- No behavior changes — generated output is identical to v2.0.0.

## [2.0.0](https://github.com/ahmedrowaihi/openapi-ts-orpc-plugin/releases/tag/v2.0.0) — Handler Modes, Faker Gen, Validator API

### Added

- **Handler modes** (`stub` | `faker` | `proxy`) — Generate handler files with three strategies: throw stubs, return faker mock data, or forward through the OpenAPI client.
- **Faker mock factories** — Per-tag `faker.gen.ts` files with field heuristics, enum support, nested objects, `allOf`/`oneOf`/`anyOf` handling.
- **Validator API** — Contracts now use the standard `createRequestSchema` pattern. Works with any hey-api validator (zod, valibot, arktype). Separate input/output validators supported.
- **JSDoc comments** on contracts from OpenAPI `summary`/`description`. Toggle with `comments: true | false`.
- **Configurable naming** via `applyNaming` from `@hey-api/shared`.
- **`operationId` grouping mode** — Fourth strategy splitting `operationId` by delimiters into groups.

### Breaking Changes

- `validation` replaced by `validator` — accepts `string | false | { input, output }`.
- `transformOperationName` replaced by `naming.operation` — uses `applyNaming` with configurable casing.
- `mode: 'compact'` — the validator API always uses detailed input structure.

### Fixed

- Contract `.output()` uses `referenceSymbol` directly.
- Proper `hasOutput` guard checking `response.mediaType && response.schema`.
- Schema extractor handles `allOf`, `oneOf`/`anyOf`, `*/*` content types, enums.
- Deterministic output ordering via `{ order: 'declarations' }`.

## [1.0.2](https://github.com/ahmedrowaihi/openapi-ts-orpc-plugin/releases/tag/v1.0.2)

Bug fixes and type improvements.

## [1.0.0](https://github.com/ahmedrowaihi/openapi-ts-orpc-plugin/releases/tag/v1.0.0)

Initial stable release — oRPC contract, router, server, and client generation from OpenAPI specs via `@hey-api/openapi-ts`.
