# contract-kit

[![pkg.pr.new](https://pkg.pr.new/badge/ahmedrowaihi/contract-kit)](https://pkg.pr.new)

OpenAPI contract toolchain — `@hey-api/openapi-ts` plugins, runtime utilities, client SDK generators (Go / Kotlin / Swift native, TypeScript via a hey-api wrapper), and live spec discovery from traffic. Everything sits on top of the [`@hey-api`](https://github.com/hey-api/openapi-ts) IR so 2.0 / 3.0 / 3.1 inputs share one normalization layer.

## Packages

<!-- @packages-start -->

### Codegen shared

| Package | Description |
| --- | --- |
| [`@ahmedrowaihi/codegen-core`](./packages/shared/codegen-core) | Spec-agnostic codegen primitives shared by OpenAPI and AsyncAPI generator families — identifier transforms (pascal/camel/safeIdent), filesystem safety, project-name derivation. Pure functions, no spec dependencies. |

### OpenAPI primitives

| Package | Description |
| --- | --- |
| [`@ahmedrowaihi/openapi-core`](./packages/openapi/core) | Shared building blocks for native-client SDK generators on top of OpenAPI 3.x — identifier transforms, security-scheme walkers, ref helpers, filesystem safety. Used by @ahmedrowaihi/openapi-go, @ahmedrowaihi/openapi-kotlin, @ahmedrowaihi/openapi-swift. |

### OpenAPI runtime utilities

| Package | Description |
| --- | --- |
| [`@ahmedrowaihi/openapi-tools`](./packages/openapi/tools) | OpenAPI utilities — request matching, spec diffing, parsing. Tree-shakable, pure functions, works on frontend or backend |

### `@hey-api/openapi-ts` plugins

| Package | Description |
| --- | --- |
| [`@ahmedrowaihi/openapi-ts-faker`](./packages/openapi/plugins/faker) | Faker.js plugin for @hey-api/openapi-ts - Generate realistic mock data factories from OpenAPI specs |
| [`@ahmedrowaihi/openapi-ts-orpc`](./packages/openapi/plugins/orpc) | oRPC plugin for @hey-api/openapi-ts - Generate type-safe RPC clients and servers from OpenAPI specs |
| [`@ahmedrowaihi/openapi-ts-paths`](./packages/openapi/plugins/paths) | Plugin for @hey-api/openapi-ts — emit per-operation route consts (spec template, URLPattern, method, operationId) for tree-shakable runtime routing and matching |
| [`@ahmedrowaihi/openapi-ts-typia`](./packages/openapi/plugins/typia) | Typia plugin for @hey-api/openapi-ts — generate compile-time Standard Schema validators from OpenAPI specs |

### OpenAPI generators

| Package | Description |
| --- | --- |
| [`@ahmedrowaihi/openapi-go`](./packages/openapi/go) | Generate idiomatic Go (net/http + encoding/json + context.Context) client SDKs from an OpenAPI 3.x spec. |
| [`@ahmedrowaihi/openapi-kotlin`](./packages/openapi/kotlin) | Generate idiomatic Kotlin (OkHttp + kotlinx-serialization + suspend) client SDKs from an OpenAPI 3.x spec. |
| [`@ahmedrowaihi/openapi-swift`](./packages/openapi/swift) | Generate idiomatic Swift (Codable + URLSession + async throws) client SDKs from an OpenAPI 3.x spec. |
| [`@ahmedrowaihi/openapi-typescript`](./packages/openapi/typescript) | Thin programmatic wrapper around @hey-api/openapi-ts that ships a `generate()` matching the shape of @ahmedrowaihi/openapi-{go,kotlin,swift}, so the same sdk-regen workflow can target TypeScript clients (types + sdk + schemas + transformers + validators + ...) via hey-api's plugin pipeline. |

### OpenAPI spec discovery

| Package | Description |
| --- | --- |
| [`@ahmedrowaihi/openapi-recon`](./packages/openapi/recon) | Reverse-engineer an OpenAPI 3.1 spec from observed HTTP traffic — runtime-agnostic, accepts standard Request/Response, works in browsers, Node, edge runtimes |

### AsyncAPI primitives

| Package | Description |
| --- | --- |
| [`@ahmedrowaihi/asyncapi-core`](./packages/asyncapi/core) | Shared AsyncAPI 3.0 primitives for codegen — uniform parseSpec entry point on top of @asyncapi/parser, plus AMQP binding extractors and routing-key matching. Mirror of @ahmedrowaihi/openapi-core for the AsyncAPI track. |

### AsyncAPI generators

| Package | Description |
| --- | --- |
| [`@ahmedrowaihi/asyncapi-typescript`](./packages/asyncapi/typescript) | AsyncAPI 3.0 → TypeScript generator. Plugin-compose architecture: a small core orchestrates parser → IR → registered plugins, each emitting one slice of generated code (types, Events const, dispatch helpers, AMQP helpers, framework adapters). Parser via @asyncapi/parser, JSON Schema → TS via @asyncapi/modelina, file orchestration via @hey-api/codegen-core. |

### Apps

| Package | Description |
| --- | --- |
| [`@ahmedrowaihi/glean`](./apps/glean) | Glean — reverse-engineer OpenAPI 3.1 specs from traffic observed in your DevTools. |

### Other

| Package | Description |
| --- | --- |
| [`@ahmedrowaihi/fn-schema-cli`](./packages/fn-schema/cli) | CLI wrapper for fn-schema. Thin orchestrator over @ahmedrowaihi/fn-schema-core with the TypeScript extractor pre-registered. Loads optional fn-schema.config.{ts,js,json} via c12. |
| [`@ahmedrowaihi/fn-schema-core`](./packages/fn-schema/core) | Language-agnostic core for fn-schema: extract function input/output JSON Schemas from source code. Defines the Extractor contract and ships emitters (files, bundle, OpenAPI) that operate on the shared FunctionInfo IR. |
| [`@ahmedrowaihi/fn-schema-typescript`](./packages/fn-schema/typescript) | TypeScript extractor for fn-schema. Walks source via ts-morph, synthesizes virtual type aliases for each function's parameters and return, then converts them to JSON Schema via ts-json-schema-generator. Re-exports a pre-wired `extract` for single-language use. |

<!-- @packages-end -->

> The package list above is auto-generated from each `package.json`'s `description` field, with categories driven by [`scripts/sync-readme.mjs`](./scripts/sync-readme.mjs). The lefthook pre-commit hook keeps it current; run `pnpm sync:readme` manually if needed.

The four `@hey-api/openapi-ts` plugins ship in lockstep (Changesets `fixed` config) — bumping one bumps all to the same version. Other packages version independently.

## Examples

| Example | Path | What it shows |
| --- | --- | --- |
| `petstore-sdk` | [`examples/petstore-sdk`](./examples/petstore-sdk) | Generate Go / Kotlin / Swift / TypeScript client SDKs from the petstore spec; each language has a buildable consumer app under `<lang>/example/` exercising CRUD, auth, multipart, per-call options, response-headers access, validators, transformers. |
| `orpc-basic` | [`examples/orpc-basic`](./examples/orpc-basic) | Minimal `@ahmedrowaihi/openapi-ts-orpc` setup. |

## Contributing

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
```

Releases run on [Changesets](https://github.com/changesets/changesets):

```bash
pnpm changeset           # describe a change
pnpm version-packages    # bump versions + write CHANGELOGs (locally)
pnpm release             # build + publish via changeset publish
```

In CI, pushing a `.changeset/*.md` to `main` opens a "Version Packages" PR; merging that PR publishes to npm.

Every PR also triggers a [pkg.pr.new](https://pkg.pr.new) preview build — install any package at the PR's commit SHA without waiting for a release:

```bash
pnpm add https://pkg.pr.new/@ahmedrowaihi/openapi-tools@<commit-sha>
```
