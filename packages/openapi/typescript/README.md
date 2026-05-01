# @ahmedrowaihi/openapi-typescript

Thin programmatic wrapper around [`@hey-api/openapi-ts`](https://www.npmjs.com/package/@hey-api/openapi-ts) that exposes the same `generate()` shape as [`@ahmedrowaihi/openapi-{go,kotlin,swift}`](https://github.com/ahmedrowaihi/contract-kit). Lets the [`sdk-regen`](https://github.com/ahmedrowaihi/contract-kit/tree/main/actions/sdk-regen) GitHub Action drive a TypeScript SDK alongside the native ones — same workflow, same inputs, four targets.

Part of [contract-kit](https://github.com/ahmedrowaihi/contract-kit). **No new codegen** — the entire TypeScript pipeline (types, sdk, schemas, transformers, validators, query hooks, ...) is hey-api's; this package only normalises the calling convention and the result shape.

## Install

```bash
pnpm add -D @ahmedrowaihi/openapi-typescript @hey-api/openapi-ts
```

`@hey-api/openapi-ts` is a peer dep so you can pin its version (and the plugins it ships) without depending on what we happen to bundle.

## Usage

```ts
import { generate } from "@ahmedrowaihi/openapi-typescript";

await generate({
  input: "openapi.yaml",
  output: "src/client",
});
```

The default plugin set is `["@hey-api/client-fetch", "@hey-api/typescript", "@hey-api/sdk"]` — types + SDK functions + a `fetch`-based runtime adapter. Override `plugins` for any other shape:

```ts
// types-only
await generate({ input, output, plugins: ["@hey-api/typescript"] });

// SDK + zod validators + tanstack-query hooks
await generate({
  input,
  output,
  plugins: [
    "@hey-api/client-fetch",
    "@hey-api/typescript",
    "@hey-api/sdk",
    "@hey-api/schemas",
    "zod",
    "@tanstack/react-query",
  ],
});
```

Anything else hey-api's `UserConfig` accepts (custom client config, parser transforms, dryRun, etc.) goes into `heyApi:`:

```ts
await generate({
  input,
  output,
  heyApi: { dryRun: true, parser: { transforms: { enums: "javascript" } } },
});
```

## Result shape

```ts
interface GenerateResult {
  output: string;                  // absolute path
  files: { path: string }[];       // relative paths under output
}
```

Matches the result shape of `@ahmedrowaihi/openapi-go` / `-kotlin` / `-swift`, so downstream tooling (the [`sdk-regen`](https://github.com/ahmedrowaihi/contract-kit/tree/main/actions/sdk-regen) action, your own CI scripts) can iterate the four packages uniformly.

## Why a wrapper

We don't ship our own TypeScript codegen — hey-api already does it well, and a competing TS gen would mean rebuilding their `ts-dsl` from scratch. But the `sdk-regen` action assumes a `generate({ input, output })` shape across all targets, and hey-api's `createClient(userConfig)` is shaped slightly differently and returns `Context[]` rather than `{ files, output }`. The wrapper closes that gap in ~30 lines of code.

## Limitations

- **Result `files`** is collected by walking the output dir post-run. So if hey-api writes outside `output` (e.g. via custom plugin paths), those files won't be reported. The default plugins all write under `output`, so this is only a concern for advanced setups.
