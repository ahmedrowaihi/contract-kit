# contract-kit

Toolkit for OpenAPI / AsyncAPI / SDK contract codegen.

## Packages

| Package | Path |
| --- | --- |
| [`@ahmedrowaihi/openapi-ts-orpc`](./packages/openapi-ts-plugins/orpc) | `packages/openapi-ts-plugins/orpc` |

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

This repo uses [Changesets](https://github.com/changesets/changesets) for independent semver per package.

```bash
pnpm changeset           # describe a change
pnpm version-packages    # bump versions + write CHANGELOGs
pnpm release             # build + publish via changeset publish
```
