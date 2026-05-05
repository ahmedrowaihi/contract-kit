# @ahmedrowaihi/fn-schema-loader

Type-safe reader over a fn-schema bundle. Generic over the bundle type so signature ids and definition names land as literal-typed unions.

Zero runtime dependencies — works in any JS runtime that can read JSON.

## When to use it

You have a fn-schema bundle (produced by the CLI or programmatically — doesn't matter which) and want ergonomic access from your app:

- server endpoints looking up schemas by id
- frontend form builders resolving `$ref` pointers
- canvas tools matching types nominally via `findByIdentity`

If you're loading the JSON in one place and reading it once, the helper is overkill — just `JSON.parse` it.

## Install

```bash
pnpm add @ahmedrowaihi/fn-schema-loader
```

## Producing a bundle

Pick whichever fits your build chain — both produce the same JSON:

### Programmatically

```ts
import { extract } from "@ahmedrowaihi/fn-schema-typescript";
import { emit } from "@ahmedrowaihi/fn-schema-core";
import { writeFile } from "node:fs/promises";

const result = await extract({
  files: ["src/api/**/*.ts"],
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
```

### Via CLI

```bash
npx fn-schema extract 'src/api/**/*.ts' --bundle generated/schemas.json --bundle-types --pretty
```

The `.ts` wrapper next to `schemas.json` is what unlocks literal-typed lookups in the reader.

## Reading

```ts
import { createReader } from "@ahmedrowaihi/fn-schema-loader";
import schemas from "./generated/schemas"; // the typed wrapper

const reader = createReader(schemas);

reader.get("createUser"); // ✅ typed
reader.get("createUserx"); // ❌ TS error
reader.has("listUsers"); // type predicate

reader.inputOf("createUser"); // resolved (top-level $ref chased)
reader.outputOf("createUser");
reader.resolveRef("#/definitions/User");

// canvas-style nominal-type matching (only when bundle was extracted with `identity`)
reader.findByIdentity("User", "x-fn-schema-ts");
// → [{ signatureId: "createUser", position: "output", schema: {...} }, ...]
```

## API

```ts
interface Reader<T extends Bundle> {
  readonly bundle: T;
  get<K extends SignatureId<T>>(id: K): T["signatures"][K] | undefined;
  has<K extends string>(id: K): id is K & SignatureId<T>;
  resolve<K extends DefinitionName<T>>(
    name: K,
  ): T["definitions"][K] | undefined;
  resolveRef(ref: string): Record<string, unknown> | undefined;
  inputOf<K extends SignatureId<T>>(id: K): unknown;
  outputOf<K extends SignatureId<T>>(id: K): unknown;
  findByIdentity(name: string, identityKey?: string): Match[];
  listSignatures(): SignatureId<T>[];
  listDefinitions(): DefinitionName<T>[];
}
```

`identityKey` defaults to `"x-fn-schema-ts"`.

## Without the typed wrapper

Works on any plain object too — you just lose autocomplete:

```ts
import { readFileSync } from "node:fs";
import { createReader, type Bundle } from "@ahmedrowaihi/fn-schema-loader";

const raw = JSON.parse(readFileSync("./schemas.json", "utf-8")) as Bundle;
const reader = createReader(raw);
```

## $ref resolution

`inputOf` / `outputOf` chase a single top-level `$ref`. Nested `$ref`s inside the schema body are left intact — call `resolveRef` yourself if you need to chase further. Keeps the helper predictable; no cycle handling.
