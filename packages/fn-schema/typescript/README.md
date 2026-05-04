# @ahmedrowaihi/fn-schema-typescript

TypeScript extractor for fn-schema. The default TS implementation of the `Extractor` contract from `core`.

Most users don't import this directly — they use the [`cli`](../cli/README.md). Reach for the programmatic API when you're building tooling on top of fn-schema.

## Install

```bash
pnpm add @ahmedrowaihi/fn-schema-typescript
```

## Quick start

```ts
import { extract } from "@ahmedrowaihi/fn-schema-typescript"

const result = await extract({
  files: ["src/api/handlers.ts"],
  tsConfigPath: "./tsconfig.json",
})

for (const sig of result.signatures) {
  console.log(sig.id, sig.input, sig.output)
}
```

`extract` is a one-shot helper. For repeat calls (server endpoints, dev mode, watch), use [`createProject`](../core/README.md) from `core` directly with `typescript()` as the extractor — it keeps the ts-morph project warm.

## What it discovers

- `function foo() {}` declarations
- `const foo = () => {}` and `const foo = function() {}`
- Class methods (instance + static, exported classes)
- Object-literal members: `export const api = { create() {}, tag: () => {} }`
- Default-export arrows: `export default (input) => {}`
- Function and method overloads (configurable via `signature.overloads`)
- `this` parameter is auto-skipped

## What it extracts

- Multi-parameter functions — `signature.parameters` controls layout (`array` / `first-only` / `object`)
- Async returns — `Promise<T>` auto-unwrapped (toggle via `signature.unwrapPromise`)
- Generic functions — skipped by default (set `signature.generics: "erase"` to coerce to `unknown`)
- Branded types (`type X = string & { __brand: "X" }`) — phantom stripped, identity preserved when the keyword is on
- Well-known types canonicalized: `Date`, `URL`, `RegExp`, `File`, `Blob`, `Buffer`, `Uint8Array`, `ArrayBuffer`, `bigint`
- `symbol` and function-as-input → `NOT_REPRESENTABLE` diagnostic

## Filters

```ts
extract({
  files: ["src/api/**/*.ts"],
  include: {
    exported: true,
    name: /^create/,
    jsDocTag: "schema",
    kind: ["function", "method"],
  },
  exclude: { name: /^_/, jsDocTag: "internal" },
  filter: (fn) => fn.async,
})
```

## How the type resolution works

For each function we synthesize a virtual TS file alongside it:

```ts
// src/__fn_schema_virtual__/handlers_createUser.virtual.ts
import type { CreateUserInput, User } from "../handlers"

type __FnSchemaMap_Date = { readonly __fn_schema_marker: "Date" }

export type __In_0 = CreateUserInput
export type __Out__ = Awaited<Promise<User>>
```

ts-json-schema-generator processes this like any other source file. Sentinel object types (`__FnSchemaMap_Date`, etc.) survive union flattening because they're structurally distinct from primitives. After generation, a post-process pass swaps each sentinel for its canonical schema and (optionally) attaches identity/transport/source-location keywords.

This indirection is what lets fn-schema reuse ts-json-schema-generator without forking it — we work around its inability to resolve `Parameters<typeof X>` and `import("path").Y` by emitting bare type identifiers and resolving cross-file imports ourselves.

## Diagnostics

Subscribe via `extract({ onDiagnostic: (d) => ... })` or read `result.diagnostics`. Codes are documented in [`core/README.md`](../core/README.md#diagnostics).
