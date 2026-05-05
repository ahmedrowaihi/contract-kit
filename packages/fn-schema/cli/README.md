# @ahmedrowaihi/fn-schema-cli

Command-line wrapper around the fn-schema extractor.

The CLI is a thin frontend over [`@ahmedrowaihi/fn-schema-typescript`](../typescript/README.md)'s `extract()` and [`@ahmedrowaihi/fn-schema-core`](../core/README.md)'s emitters. Every flag maps 1:1 to a programmatic option. Use whichever fits your build chain — the CLI for ad-hoc / package.json scripts, the programmatic API when you want to integrate with another tool.

## Install

```bash
pnpm add -D @ahmedrowaihi/fn-schema-cli
# or: npm i -D @ahmedrowaihi/fn-schema-cli
# or: yarn add -D @ahmedrowaihi/fn-schema-cli
```

The bin is `fn-schema`. Run via `npx fn-schema ...`, or wire a `package.json` script:

```jsonc
{
  "scripts": {
    "schemas": "fn-schema extract 'src/api/**/*.ts' --bundle generated/schemas.json --bundle-types --pretty",
  },
}
```

## Quick start

```bash
# per-signature JSON files
npx fn-schema extract 'src/**/*.ts' --out generated --pretty

# single bundled JSON
npx fn-schema extract 'src/**/*.ts' --bundle generated/schemas.json --pretty

# bundle + typed TS wrapper for the loader package
npx fn-schema extract 'src/**/*.ts' --bundle generated/schemas.json --bundle-types --pretty

# OpenAPI 3.1 components doc
npx fn-schema extract 'src/**/*.ts' --openapi generated/openapi.json --pretty
```

## Watch mode

```bash
npx fn-schema extract 'src/api/**/*.ts' --bundle generated/schemas.json --bundle-types --watch
```

Keeps a warm `Project` between rebuilds, so changes after the first run land in tens of milliseconds.

## Discovery & diff commands

```bash
# list every function the extractor would see (no schema generation)
npx fn-schema scan 'src/**/*.ts'

# resolved input/output schema for a single function
npx fn-schema inspect createUser 'src/api/**/*.ts'

# interactive picker — discover, multi-select, then print/bundle/files/openapi
npx fn-schema browse 'src/**/*.ts'

# bundle-vs-bundle diff (CI-friendly: --breaking-only exits 1 only on removed/changed)
npx fn-schema diff old/schemas.json new/schemas.json --breaking-only
```

| Command   | Purpose                                                                                                     |
| --------- | ----------------------------------------------------------------------------------------------------------- |
| `scan`    | Read-only function listing — fast, no schemas. Pipe `--json` to other tools or eyeball filter regexes.      |
| `inspect` | Resolved input/output for one function. Verify mappings without writing the bundle.                         |
| `browse`  | Interactive (clack) picker. Pick functions, then choose an action: print, bundle, per-file, or OpenAPI doc. |
| `diff`    | Compare two emitted bundles. `--breaking-only` for CI gates that fail only on removed or changed shapes.    |

## Vendor-extension keywords

```bash
npx fn-schema extract 'src/**/*.ts' --bundle generated/schemas.json \
  --identity x-fn-schema-ts \
  --transport x-fn-schema-transport \
  --source-locations x-fn-schema-source
```

Each takes a keyword name. Off by default. Pass `""` or `false` to explicitly disable when a config file would otherwise enable it.

| Flag                 | Attached to                 | Use                                    |
| -------------------- | --------------------------- | -------------------------------------- |
| `--identity`         | mapped + named-type schemas | nominal-type matching across functions |
| `--transport`        | binary-shaped schemas       | frontend picks `multipart` vs `base64` |
| `--source-locations` | named definitions           | navigation + drift detection           |

## All flags

Run `npx fn-schema --help` for the full list. Highlights:

- `--out, -o <dir>` — per-signature files
- `--bundle <path>` — single JSON bundle
- `--bundle-types` — emit sibling `.ts` wrapper alongside `--bundle`
- `--openapi <path>` — OpenAPI 3.1 components doc
- `--watch` — regenerate on file change
- `--tsconfig <path>` — override tsconfig (default: nearest from cwd)
- `--include-tag <name>` — only fns with this JSDoc tag
- `--exclude-name <regex>` — exclude fns matching name
- `--params array|first-only|object` — parameter layout
- `--naming function-name|file-function|jsdoc-tag` — id strategy
- `--dialect draft-07|draft-2020-12|openapi-3.1`
- `--pretty`, `--quiet`, `--cwd <dir>`

## Config file

Optional `fn-schema.config.{ts,js,json,mjs,cjs}` at the project root, loaded via [c12](https://github.com/unjs/c12):

```ts
// fn-schema.config.ts
import type { FnSchemaConfig } from "@ahmedrowaihi/fn-schema-cli";

export default {
  files: "src/api/**/*.ts",
  out: "generated",
  signature: { parameters: "first-only" },
  schema: {
    identity: "x-fn-schema-ts",
    typeMappers: { MyBrand: { type: "string", format: "uuid" } },
  },
} satisfies FnSchemaConfig;
```

CLI flags override config values. Both fall back to core defaults.

## Doing it programmatically instead

Anything the CLI does, you can do from a Node script:

```ts
import { writeFile } from "node:fs/promises";
import { extract } from "@ahmedrowaihi/fn-schema-typescript";
import { emit } from "@ahmedrowaihi/fn-schema-core";

const result = await extract({
  files: ["src/api/**/*.ts"],
  signature: { parameters: "first-only" },
  schema: { identity: "x-fn-schema-ts" },
});

await writeFile(
  "generated/schemas.json",
  emit.toBundle(result, { pretty: true }),
);
```

For long-lived processes (servers, watchers), use [`createProject`](../core/README.md) instead of `extract` to keep the ts-morph project warm between calls.

## Exit codes

`0` on success. `1` when any error-severity diagnostic was emitted, or when no source patterns were supplied.
