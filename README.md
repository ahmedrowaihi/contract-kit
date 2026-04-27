# contract-kit

[![pkg.pr.new](https://pkg.pr.new/badge/ahmedrowaihi/contract-kit)](https://pkg.pr.new)

Toolkit for OpenAPI / AsyncAPI / SDK contract codegen.

## Naming convention

| Prefix | Category | Example |
| --- | --- | --- |
| `openapi-ts-*` | `@hey-api/openapi-ts` plugins | `@ahmedrowaihi/openapi-ts-orpc` |
| `openapi-*` | Standalone OpenAPI tools | `@ahmedrowaihi/openapi-tools` |
| `asyncapi-*` | AsyncAPI family (planned) | `@ahmedrowaihi/asyncapi-tools` |
| `sdk-*` | Client SDK generators (planned) | `@ahmedrowaihi/sdk-swift` |

## Packages

<!-- @packages-start -->

### `@hey-api/openapi-ts` plugins

| Package | Description |
| --- | --- |
| [`@ahmedrowaihi/openapi-ts-faker`](./packages/openapi-ts-plugins/faker) | Faker.js plugin for @hey-api/openapi-ts - Generate realistic mock data factories from OpenAPI specs |
| [`@ahmedrowaihi/openapi-ts-orpc`](./packages/openapi-ts-plugins/orpc) | oRPC plugin for @hey-api/openapi-ts - Generate type-safe RPC clients and servers from OpenAPI specs |
| [`@ahmedrowaihi/openapi-ts-paths`](./packages/openapi-ts-plugins/paths) | Plugin for @hey-api/openapi-ts — emit per-operation route consts (spec template, URLPattern, method, operationId) for tree-shakable runtime routing and matching |
| [`@ahmedrowaihi/openapi-ts-typia`](./packages/openapi-ts-plugins/typia) | Typia plugin for @hey-api/openapi-ts — generate compile-time Standard Schema validators from OpenAPI specs |

### Standalone OpenAPI tools

| Package | Description |
| --- | --- |
| [`@ahmedrowaihi/openapi-tools`](./packages/openapi-tools) | OpenAPI utilities — request matching, spec diffing, parsing. Tree-shakable, pure functions, works on frontend or backend |

<!-- @packages-end -->

The `@hey-api/openapi-ts` plugins ship in lockstep (`fixed` Changesets config) — bumping one bumps all to the same version.

> The package list above is auto-generated from each `package.json`'s `description` field. To regenerate manually run `pnpm sync:readme`. Otherwise the lefthook pre-commit hook keeps it current.

## Examples

| Example | Path |
| --- | --- |
| `@contract-kit/example-orpc-basic` | `examples/orpc-basic` |

## Develop

```bash
pnpm install
pnpm build
pnpm typecheck
```

## Release

This repo uses [Changesets](https://github.com/changesets/changesets). The three plugins are version-locked.

```bash
pnpm changeset           # describe a change
pnpm version-packages    # bump versions + write CHANGELOGs (locally)
pnpm release             # build + publish via changeset publish
```

In CI: pushing a `.changeset/*.md` to `main` opens a "Version Packages" PR; merging that PR publishes to npm.

## Preview packages (per PR)

Every PR triggers a [pkg.pr.new](https://pkg.pr.new) preview build. The bot comments install commands on the PR; you can install any package at the PR's commit SHA without waiting for a release:

```bash
pnpm add https://pkg.pr.new/@ahmedrowaihi/openapi-tools@<commit-sha>
```

Useful for testing fixes downstream before they merge.
