# fn-schema

Extract JSON Schemas for **function inputs and outputs** from TypeScript source.

You write idiomatic TS. fn-schema reads it and emits JSON Schema for every function signature.

## The packages

| Package                                | What                                                      |
| -------------------------------------- | --------------------------------------------------------- |
| [`core`](core/README.md)               | Language-agnostic IR + emitters + `Extractor` contract    |
| [`typescript`](typescript/README.md)   | TS extractor (`extract()` API)                            |
| [`cli`](cli/README.md)                 | `fn-schema` bin — a thin wrapper around `extract()`       |
| [`loader`](loader/README.md)           | Type-safe reader for an emitted bundle                    |
| [`unplugin`](unplugin/README.md)       | Vite/webpack/rollup/esbuild plugin (virtual module + HMR) |
| [`transformer`](transformer/README.md) | TS compiler transformer (compile-time inlining)           |

Two ways to drive everything:

```ts
// programmatic — works from any Node script
import { extract } from "@ahmedrowaihi/fn-schema-typescript";
import { emit } from "@ahmedrowaihi/fn-schema-core";

const result = await extract({ files: ["src/**/*.ts"] });
const bundleJson = emit.toBundle(result, { pretty: true });
```

```bash
# CLI — same thing, from the terminal
npx fn-schema 'src/**/*.ts' --bundle generated/schemas.json --pretty
```

The CLI is a thin wrapper over `extract()`. Every flag maps to an `ExtractOptions` field. Use whichever fits your build chain.

## Pick a delivery mode

| You want                                       | Use                                                           |
| ---------------------------------------------- | ------------------------------------------------------------- |
| Generate `schemas.json` once at build, ship it | `cli` or `extract()` + `emit.toBundle`                        |
| Read it in your app with autocomplete          | `cli --bundle-types` or `emit.toBundleTypesModule` + `loader` |
| Auto-regen during dev                          | `cli --watch` (any framework) or `unplugin` (Vite/webpack/…)  |
| Inline schemas as JS literals at compile time  | `transformer`                                                 |
| Embed in your own tooling                      | `core` + `typescript` directly                                |

## Quick start

### Programmatic

```ts
import { writeFile } from "node:fs/promises";
import { extract } from "@ahmedrowaihi/fn-schema-typescript";
import { emit } from "@ahmedrowaihi/fn-schema-core";
import { createReader } from "@ahmedrowaihi/fn-schema-loader";

const result = await extract({
  files: ["src/api/handlers.ts"],
  schema: { identity: "x-fn-schema-ts" },
});

await writeFile(
  "generated/schemas.json",
  emit.toBundle(result, { pretty: true }),
);
await writeFile(
  "generated/schemas.ts",
  emit.toBundleTypesModule(result, { jsonImport: "./schemas.json" }),
);

// later, in your app:
const reader = createReader(JSON.parse(/* schemas.json */));
reader.get("createUser");
reader.findByIdentity("User");
```

### CLI

```bash
pnpm add -D @ahmedrowaihi/fn-schema-cli
npx fn-schema 'src/**/*.ts' --bundle generated/schemas.json --bundle-types --pretty
```

```ts
import { createReader } from "@ahmedrowaihi/fn-schema-loader";
import schemas from "./generated/schemas";

const reader = createReader(schemas);
```

Each package's README has full options, examples, and trade-offs.
