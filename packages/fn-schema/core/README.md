# @ahmedrowaihi/fn-schema-core

Language-agnostic IR + emitters for fn-schema. Defines the `Extractor` contract that language-specific packages implement, and ships the orchestration + output paths every extractor shares.

## When to use this directly

Most users don't import `core` — they use the [`cli`](../cli/README.md) or `@ahmedrowaihi/fn-schema-typescript` (which re-exports a pre-wired `extract`). Reach for `core` when you want to:

- register multiple extractors in the same run (e.g. TS + Python, when Python lands)
- keep a long-lived `Project` warm across many `extract()` calls
- build your own emitter on top of the orchestrator

## Quick start

```ts
import { createProject } from "@ahmedrowaihi/fn-schema-core"
import { typescript } from "@ahmedrowaihi/fn-schema-typescript"

const project = createProject({
  cwd: process.cwd(),
  tsConfigPath: "./tsconfig.json",
  extractors: [typescript()],
})

const result = await project.extract({
  files: ["src/api/handlers.ts"],
  schema: { identity: "x-fn-schema-ts", transport: "x-fn-schema-transport" },
})

project.dispose()
```

## Emitters

```ts
import { emit } from "@ahmedrowaihi/fn-schema-core"

emit.toFiles(result, { dir: "generated", format: "json-pretty" })
emit.toBundle(result, { pretty: true })
emit.toBundleTypesModule(result, { jsonImport: "./schemas.json" })
emit.toOpenAPI(result, { title: "my-api" })
```

- `toFiles` — one JSON per signature
- `toBundle` — single JSON with all signatures + shared definitions
- `toBundleTypesModule` — TS wrapper exporting the bundle under literal-typed signature ids and definition names (pair with [`loader`](../loader/README.md))
- `toOpenAPI` — components-only OpenAPI 3.1 doc; tuples use `prefixItems`

## Schema knobs

```ts
schema: {
  dialect: "draft-07" | "draft-2020-12" | "openapi-3.1",
  expose: "all" | "export" | "none",
  topRef: false,
  additionalProperties: false,

  // user overrides built-in mappings (Date, File, Buffer, …)
  typeMappers: { MyType: { type: "string", format: "uuid" } },

  // off-by-default vendor extensions
  identity: "x-fn-schema-ts",            // attach originating TS type name
  transport: "x-fn-schema-transport",    // attach multipart/base64 hint
  sourceLocations: "x-fn-schema-source", // attach file:line:col
}
```

## Diagnostics

Every mapping decision is observable:

| Code | Severity | When |
|---|---|---|
| `TYPE_MAPPED` | info | Well-known TS type rewritten to canonical JSON Schema |
| `LOSSY_MAPPING` | warning | Mapping lost information (e.g. `bigint` → `integer`) |
| `NOT_REPRESENTABLE` | error | Type can't be represented in JSON Schema (e.g. `symbol`) |
| `GENERIC_SKIPPED` | warning | Generic function skipped (set `signature.generics: "erase"` to override) |
| `DUPLICATE_ID` | warning | Definition emitted with conflicting shapes from two functions |
| `EXTRACTOR_FAILURE` | error | Extractor threw on a function |
| `EMPTY_RESULT` | info | No signatures matched the filter |
| `NO_EXTRACTOR` | warning | A file's extension isn't claimed by any registered extractor |

Subscribe via `extract({ onDiagnostic: (d) => ... })` or read `result.diagnostics` after.

## Extractor contract

Other languages plug in by implementing:

```ts
interface Extractor {
  readonly extensions: readonly string[]
  readonly language: string
  init(opts: ExtractorInitOptions): Promise<ExtractorInstance>
}

interface ExtractorInstance {
  discover(files: readonly string[], filter: ResolvedFilter): Promise<FunctionInfo[]>
  toSchemas(fn: FunctionInfo, opts: ResolvedSignatureOptions & ResolvedSchemaOptions): Promise<SignaturePair>
  refresh(files: readonly string[]): void
  dispose(): void
}
```
