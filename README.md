# contract-kit

Toolkit for OpenAPI / AsyncAPI / SDK contract codegen.

## Naming convention

| Prefix | Category | Example |
| --- | --- | --- |
| `openapi-ts-*` | `@hey-api/openapi-ts` plugins | `@ahmedrowaihi/openapi-ts-orpc` |
| `openapi-*` | Standalone OpenAPI tools (planned) | `@ahmedrowaihi/openapi-diff` |
| `asyncapi-*` | AsyncAPI family (planned) | `@ahmedrowaihi/asyncapi-rabbitmq` |
| `sdk-*` | Client SDK generators (planned) | `@ahmedrowaihi/sdk-swift` |

## Packages

### `@hey-api/openapi-ts` plugins

| Package | Path |
| --- | --- |
| [`@ahmedrowaihi/openapi-ts-orpc`](./packages/openapi-ts-plugins/orpc) | oRPC client/server codegen |
| [`@ahmedrowaihi/openapi-ts-faker`](./packages/openapi-ts-plugins/faker) | Faker.js mock factories |
| [`@ahmedrowaihi/openapi-ts-typia`](./packages/openapi-ts-plugins/typia) | Typia compile-time validators |

All three ship in lockstep (`fixed` Changesets config) — bumping one bumps all to the same version.

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
