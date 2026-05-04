# @ahmedrowaihi/fn-schema-unplugin

Bundler plugin for fn-schema. Resolves a virtual module to the extracted bundle, with HMR on source change in Vite. Built on [unplugin](https://github.com/unjs/unplugin) — same package powers Vite, webpack, Rollup, esbuild, Rspack, Rolldown, and Farm.

## When to use it

You have a Vite/Next/webpack app and want fn-schema results available via a regular import — without running the [`cli`](../cli/README.md) as a separate process. The plugin keeps a warm `Project` instance during dev and triggers a reload when source files change.

## Install

```bash
pnpm add -D @ahmedrowaihi/fn-schema-unplugin
```

## Vite

```ts
// vite.config.ts
import { defineConfig } from "vite"
import fnSchema from "@ahmedrowaihi/fn-schema-unplugin/vite"

export default defineConfig({
  plugins: [
    fnSchema({
      files: "src/api/**/*.ts",
      schema: { identity: "x-fn-schema-ts", transport: "x-fn-schema-transport" },
    }),
  ],
})
```

```ts
// app code
import schemas from "virtual:fn-schema/bundle"
import { createReader } from "@ahmedrowaihi/fn-schema-loader"

const reader = createReader(schemas)
```

## Other bundlers

```ts
// webpack
const fnSchema = require("@ahmedrowaihi/fn-schema-unplugin/webpack").default

// rollup
import fnSchema from "@ahmedrowaihi/fn-schema-unplugin/rollup"

// esbuild
import fnSchema from "@ahmedrowaihi/fn-schema-unplugin/esbuild"
```

Subpath exports also exist for `/rspack`, `/rolldown`, `/farm`.

## Options

```ts
interface FnSchemaPluginOptions {
  files: string | string[]            // required
  cwd?: string                         // default: process.cwd()
  tsConfigPath?: string
  virtualModuleId?: string             // default: "virtual:fn-schema/bundle"
  // …all extract options (include, exclude, signature, schema, naming, hooks)
}
```

## CLI vs unplugin

| | CLI | unplugin |
|---|---|---|
| extra dev process | yes | no |
| HMR on schema change | manual (your watcher) | built-in (Vite) |
| works outside a bundler | yes | no |
| produces disk artifact (`schemas.json`) | yes | no (in-memory) |

Use the CLI when you want a checked-in `schemas.json` — for backend Node servers, deployment validation, or sharing across services. Use unplugin when fn-schema is a per-app dev concern.
