# contract-kit

[![pkg.pr.new](https://pkg.pr.new/badge/ahmedrowaihi/contract-kit)](https://pkg.pr.new)

OpenAPI contract toolchain — `@hey-api/openapi-ts` plugins, runtime utilities, client SDK generators (Go / Kotlin / Swift native, TypeScript via a hey-api wrapper), and live spec discovery from traffic. Everything sits on top of the [`@hey-api`](https://github.com/hey-api/openapi-ts) IR so 2.0 / 3.0 / 3.1 inputs share one normalization layer.

## Packages

<!-- @packages-start -->

### `@hey-api/openapi-ts` plugins

| Package | Description |
| --- | --- |
| [`@ahmedrowaihi/openapi-ts-faker`](./packages/openapi-ts-plugins/faker) | Faker.js plugin for @hey-api/openapi-ts - Generate realistic mock data factories from OpenAPI specs |
| [`@ahmedrowaihi/openapi-ts-orpc`](./packages/openapi-ts-plugins/orpc) | oRPC plugin for @hey-api/openapi-ts - Generate type-safe RPC clients and servers from OpenAPI specs |
| [`@ahmedrowaihi/openapi-ts-paths`](./packages/openapi-ts-plugins/paths) | Plugin for @hey-api/openapi-ts — emit per-operation route consts (spec template, URLPattern, method, operationId) for tree-shakable runtime routing and matching |
| [`@ahmedrowaihi/openapi-ts-typia`](./packages/openapi-ts-plugins/typia) | Typia plugin for @hey-api/openapi-ts — generate compile-time Standard Schema validators from OpenAPI specs |

### OpenAPI runtime utilities

| Package | Description |
| --- | --- |
| [`@ahmedrowaihi/openapi-tools`](./packages/openapi-tools) | OpenAPI utilities — request matching, spec diffing, parsing. Tree-shakable, pure functions, works on frontend or backend |

### Native client SDK generators

| Package | Description |
| --- | --- |
| [`@ahmedrowaihi/oas-core`](./packages/oas-core) | Shared building blocks for native-client SDK generators on top of OpenAPI 3.x — identifier transforms, security-scheme walkers, ref helpers, filesystem safety. Used by @ahmedrowaihi/openapi-go, @ahmedrowaihi/openapi-kotlin, @ahmedrowaihi/openapi-swift. |
| [`@ahmedrowaihi/openapi-go`](./packages/openapi-go) | Generate idiomatic Go (net/http + encoding/json + context.Context) client SDKs from an OpenAPI 3.x spec. |
| [`@ahmedrowaihi/openapi-kotlin`](./packages/openapi-kotlin) | Generate idiomatic Kotlin (OkHttp + kotlinx-serialization + suspend) client SDKs from an OpenAPI 3.x spec. |
| [`@ahmedrowaihi/openapi-swift`](./packages/openapi-swift) | Generate idiomatic Swift (Codable + URLSession + async throws) client SDKs from an OpenAPI 3.x spec. |
| [`@ahmedrowaihi/openapi-typescript`](./packages/openapi-typescript) | Thin programmatic wrapper around @hey-api/openapi-ts that ships a `generate()` matching the shape of @ahmedrowaihi/openapi-{go,kotlin,swift}, so the same sdk-regen workflow can target TypeScript clients (types + sdk + schemas + transformers + validators + ...) via hey-api's plugin pipeline. |

### Spec discovery from traffic

| Package | Description |
| --- | --- |
| [`@ahmedrowaihi/openapi-recon`](./packages/openapi-recon) | Reverse-engineer an OpenAPI 3.1 spec from observed HTTP traffic — runtime-agnostic, accepts standard Request/Response, works in browsers, Node, edge runtimes |

### Apps

| Package | Description |
| --- | --- |
| [`@ahmedrowaihi/glean`](./apps/glean) | Glean — reverse-engineer OpenAPI 3.1 specs from traffic observed in your DevTools. |

### Other

| Package | Description |
| --- | --- |
| [`@ahmedrowaihi/codegen-core`](./packages/codegen-core) | Spec-agnostic codegen primitives shared by OpenAPI and AsyncAPI generator families — identifier transforms (pascal/camel/safeIdent), filesystem safety, project-name derivation. Pure functions, no spec dependencies. |

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
