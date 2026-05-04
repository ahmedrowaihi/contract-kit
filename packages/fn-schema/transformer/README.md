# @ahmedrowaihi/fn-schema-transformer

TypeScript compiler-API transformer that **inlines fn-schema results into emitted JS at compile time**. Replaces every `schemaOf(fn)` call with a literal JSON Schema object pulled from a pre-extracted bundle.

## When to use this — and when not to

Use it when you want zero runtime cost: no `JSON.parse` on cold start, no `schemas.json` artifact at runtime, no ts-morph dep in your shipped bundle.

For 95% of users the [`loader`](../loader/README.md) is the right answer — simpler to set up and works in every TS toolchain. Only reach for the transformer when you've measured a real cost (cold-start latency, bundle size) or your deployment target forbids JSON files.

|                          | loader                    | transformer                        |
| ------------------------ | ------------------------- | ---------------------------------- |
| setup                    | `import`                  | `ts-patch` + tsconfig plugin entry |
| runtime cost             | one `JSON.parse`          | none                               |
| live updates             | yes (re-extract + import) | no (rebuild required)              |
| works with vanilla `tsc` | yes                       | no (needs `tspc`)                  |

## Install

```bash
pnpm add -D @ahmedrowaihi/fn-schema-transformer ts-patch
```

## Setup

### 1. Produce a bundle

Either path works — the transformer just needs a `schemas.json` on disk before tsc runs.

**Programmatic** (in a build script):

```ts
import { extract } from "@ahmedrowaihi/fn-schema-typescript";
import { emit } from "@ahmedrowaihi/fn-schema-core";
import { writeFile, mkdir } from "node:fs/promises";

const result = await extract({ files: ["src/api/**/*.ts"] });
await mkdir("generated", { recursive: true });
await writeFile("generated/schemas.json", emit.toBundle(result));
```

**CLI**:

```bash
npx fn-schema 'src/api/**/*.ts' --bundle generated/schemas.json --pretty
```

### 2. Configure ts-patch

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "plugins": [
      {
        "transform": "@ahmedrowaihi/fn-schema-transformer",
        "bundlePath": "./generated/schemas.json",
      },
    ],
  },
}
```

```jsonc
// package.json — bundle must exist before tspc runs
{
  "scripts": {
    "build:schemas": "node scripts/extract.mjs",
    "build:ts": "tspc",
    "build": "pnpm build:schemas && pnpm build:ts",
  },
}
```

`tspc` is `ts-patch`'s patched compiler (replaces `tsc`).

### 3. Use the runtime markers

```ts
import {
  schemaOf,
  inputSchemaOf,
  outputSchemaOf,
} from "@ahmedrowaihi/fn-schema-transformer/runtime";
import { createUser } from "./api/handlers";

const meta = schemaOf(createUser);
const inputSchema = inputSchemaOf(createUser);
const outputSchema = outputSchemaOf(createUser);
```

After transformation, the emitted JS has:

```js
const meta = { input: { type: "object", properties: { ... } }, output: { ... } }
const inputSchema = { type: "object", properties: { ... } }
const outputSchema = { ... }
```

The runtime stubs return `undefined` if the transformer is NOT applied, so dev tooling that doesn't run the transformer (`tsx`, `vitest`, etc.) doesn't break — calls just return `undefined`.

## What gets replaced

Direct calls only:

```ts
schemaOf(myFunction); // ✅ inlined
inputSchemaOf(myFunction); // ✅
outputSchemaOf(myFunction); // ✅

const fn = myFunction;
schemaOf(fn); // ❌ not inlined (argument is a binding, not the original identifier)

schemaOf(makeFn()); // ❌ not inlined (call expression)
```

Lookup is by the argument identifier's name. If `myFunction` isn't in the bundle, the call is left alone — no error, but you get `undefined` at runtime via the stub.

## Limitations

- TS transformers are **synchronous**. The bundle must exist on disk before tsc runs — wire your build chain so extraction completes first.
- Doesn't work with vanilla `tsc` — needs [`ts-patch`](https://github.com/nonara/ts-patch)'s `tspc` (or another tool supporting custom transformers).
- Source-map fidelity is best-effort.
