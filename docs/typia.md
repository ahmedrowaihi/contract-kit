# Typia Integration

Instead of Zod, you can use [Typia](https://typia.io/) for runtime validation. Typia generates validators at compile-time from TypeScript types — no schema duplication.

## How it works

With `validation: 'typia'`, the plugin generates contracts using `typia.createValidate<T>()` referencing the TypeScript types produced by `@hey-api/typescript`. Typia v11 returns Standard Schema objects, which oRPC accepts directly on `.input()` and `.output()`.

## Installation

```bash
bun add typia
bun add -d @ryoppippi/unplugin-typia
```

> Typia requires a compiler transform to work. Use `unplugin-typia` for your bundler.

## Build setup

### tsdown / rolldown

```typescript
// tsdown.config.ts
import { defineConfig } from 'tsdown'
import UnpluginTypia from '@ryoppippi/unplugin-typia/rolldown'

export default defineConfig({
  entry: ['src/server.ts'],
  format: 'esm',
  outDir: 'dist',
  plugins: [UnpluginTypia()],
})
```

### Vite

```typescript
// vite.config.ts
import UnpluginTypia from '@ryoppippi/unplugin-typia/vite'

export default { plugins: [UnpluginTypia()] }
```

## openapi-ts config

Typia requires a type transformer to annotate TypeScript types with constraint tags (MinLength, Maximum, etc.) so validators are generated correctly. Import it directly from this package:

```typescript
import { defineConfig as defineORPCConfig, typiaTypeTransformer } from '@ahmedrowaihi/openapi-ts-orpc';
import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: 'openapi.json',
  output: { path: './src/generated' },
  plugins: [
    '@hey-api/typescript',
    {
      name: '@hey-api/transformers',
      typeTransformers: [typiaTypeTransformer],
    },
    defineORPCConfig({
      validation: 'typia',
      // ... rest of your config
    }),
  ],
});
```

> Note: the `zod` plugin is not needed when using Typia. The plugin removes it automatically from its dependencies when `validation: 'typia'` is set.

## OpenAPI spec generation

oRPC's OpenAPI generator needs to convert your Typia schemas to JSON Schema. Typia schemas don't carry JSON Schema by default — you need to attach it at build time using `typia.json.schema<T>()` alongside `typia.createValidate<T>()`.

Copy [`typia-orpc.ts`](./typia-orpc.ts) into your project (e.g. `src/lib/typia-orpc.ts`), then:

1. Wrap your schemas with `ot.schema()`:

```typescript
import typia from 'typia'
import { ot } from '#/lib/typia-orpc'

const UserSchema = ot.schema(
  typia.createValidate<User>(),
  typia.json.schema<User>(),
)
```

2. Register `TypiaToJsonSchemaConverter` in your OpenAPI plugin:

```typescript
import { TypiaToJsonSchemaConverter } from '#/lib/typia-orpc'

new SmartCoercionPlugin({
  schemaConverters: [
    new ZodToJsonSchemaConverter(),
    new TypiaToJsonSchemaConverter(),
  ],
})
```

## What the transformer does

`typiaTypeTransformer` annotates TypeScript types with Typia constraint tags derived from your OpenAPI schema:

| OpenAPI constraint | Typia tag |
|---|---|
| `minLength` / `maxLength` | `MinLength<N>` / `MaxLength<N>` |
| `pattern` | `Pattern<"...">` |
| `format` | `Format<"...">` |
| `minimum` / `maximum` | `Minimum<N>` / `Maximum<N>` |
| `exclusiveMinimum` / `exclusiveMaximum` | `ExclusiveMinimum<N>` / `ExclusiveMaximum<N>` |
| integer `format` (int32, int64, …) | `Type<"int32">` etc. |
| `minItems` / `maxItems` | `MinItems<N>` / `MaxItems<N>` |
