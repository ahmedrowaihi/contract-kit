# Changelog

## 3.0.0

### Major Changes

- Unified versioning under contract-kit 3.0. All hey-api plugins now share a version (`fixed` lockstep) and ship from a single monorepo. faker and typia jump from 0.x; orpc moves from 2.x. No runtime API change — the version reset is the change.

  Old standalone packages (`@ahmedrowaihi/openapi-ts-{faker,typia}` from their original repos) will be deprecated post-release with pointers here.

### Patch Changes

- Updated dependencies [[`c10d0a0`](https://github.com/ahmedrowaihi/contract-kit/commit/c10d0a03fd11ca505b317624e51ad330df67c978)]:
  - @ahmedrowaihi/openapi-ts-faker@3.0.0

All notable changes to `@ahmedrowaihi/openapi-ts-orpc` are documented here.

## [2.4.1](https://github.com/ahmedrowaihi/openapi-ts-orpc-plugin/releases/tag/v2.4.1) — Faker fixes + handler options

### Added

- `handlers.faker.fieldNameHints` and `handlers.faker.formatMapping` — typed against `FakerMethodPath`.
- `handlers.faker.respectConstraints` is now actually wired (was a no-op).

### Fixed

- Faker mode no longer emits empty `arrayElement()`. Inherits all fixes from `@ahmedrowaihi/openapi-ts-faker@^0.3.0` (refs as factory calls, `helpers.multiple` for arrays, `oneOf`/`anyOf`/`allOf`, cyclic-ref break).

### Changed

- `@hey-api/shared`, `@hey-api/codegen-core`, `@ahmedrowaihi/openapi-ts-faker` moved to `peerDependencies` to dedupe across ecosystem plugins.

## [2.4.0](https://github.com/ahmedrowaihi/openapi-ts-orpc-plugin/releases/tag/v2.4.0) — typia validator support

### Added

- **`validator: "@ahmedrowaihi/openapi-ts-typia"`** — typia joins zod / valibot / arktype as a first-class validator option. Generated contracts pass each operation's typia validator directly to `.input()` / `.output()` and per-status error twins to `.errors({ [code]: { data: tXxxResponseError<code> } })`.

  ```ts
  import { defineConfig as defineORPCConfig } from "@ahmedrowaihi/openapi-ts-orpc";
  import { defineConfig as defineTypiaConfig } from "@ahmedrowaihi/openapi-ts-typia";

  export default defineConfig({
    plugins: [
      // ...typescript + transformers
      defineTypiaConfig(),
      defineORPCConfig({
        validator: "@ahmedrowaihi/openapi-ts-typia",
      }),
    ],
  });
  ```

  Requires `@ahmedrowaihi/openapi-ts-typia` ^0.2.0.

## [2.3.3](https://github.com/ahmedrowaihi/openapi-ts-orpc-plugin/releases/tag/v2.3.3) — Fix missing runtime deps

### Fixed

- **`@hey-api/codegen-core` and `@hey-api/shared` moved from `devDependencies` to `dependencies`** — Both are imported by `./tools` (`parse.js`, `diff.js`) at runtime, but were only declared as dev deps. Under strict package managers (pnpm), consumers hit `Module not found: Can't resolve '@hey-api/codegen-core'` at build time because the packages weren't present in the plugin's isolated `node_modules`. Previously worked only by accident when the consumer's hoisting happened to expose them.

## [2.3.0](https://github.com/ahmedrowaihi/openapi-ts-orpc-plugin/releases/tag/v2.3.0) — Full Endpoint Diff (params, query, headers, cookies)

### Added

- **`diffSpecs` now compares all request layers** — path params, query params, headers, and cookies are diffed alongside request body and response. All layers enabled by default.
- **`options.compare`** — Opt out of specific layers:
  ```ts
  diffSpecs(base, head, { compare: { headers: false, cookies: false } });
  ```

### Fixed

- **`./tools` export** — Subpath was missing from `package.json` exports in v2.2.0.

### Changed

- **`EndpointDiff`** now includes `params`, `query`, `headers`, and `cookies` fields (all `ShapeDiff | null`).
- **`typedEntries` helper** — Replaces raw `Object.entries` casts for proper type inference on IR records.

## [2.2.0](https://github.com/ahmedrowaihi/openapi-ts-orpc-plugin/releases/tag/v2.2.0) — Spec Diff Tools

### Added

- **`@ahmedrowaihi/openapi-ts-orpc/tools`** — New export with spec diffing utilities built on hey-api's native IR and schema walker.
  - `parseSpec(spec)` — Parse any OpenAPI spec (2.0, 3.0, 3.1) into hey-api's normalized IR using `parseOpenApiSpec`, `Context`, and `getParser`.
  - `diffSpecs(base, head, options?)` — Diff two parsed IR models endpoint-by-endpoint. Compares request body and response shapes property-by-property, detecting added/removed properties, type changes, and required/optional changes.
  - `options.filter` — Generic filter function `(method, path) => boolean` to scope the diff to specific endpoints.

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
