# Typia Integration

Instead of Zod, you can use [Typia](https://typia.io/) for runtime validation.
Typia generates validators at compile-time from TypeScript types — no schema
duplication.

Integration is via the [`@ahmedrowaihi/openapi-ts-typia`](https://github.com/ahmedrowaihi/openapi-ts)
companion plugin. This oRPC plugin consumes it through the standard
validator API, the same way it consumes `zod`, `valibot`, or `arktype`.

## How it works

With `validator: '@ahmedrowaihi/openapi-ts-typia'`, the typia plugin emits
one `typia.createValidate<T>()` per operation plus a bulk
`typia.json.schemas<[...]>()` call whose result is indexed by
operation. The oRPC plugin references those symbols directly on each
contract's `.input()` / `.output()` / `.errors()`.

## Installation

```bash
bun add -d @ahmedrowaihi/openapi-ts-typia
bun add typia @standard-schema/spec
bun add -d @ryoppippi/unplugin-typia
```

Typia requires a compiler transform to work. Use `unplugin-typia` for
your bundler.

`@standard-schema/spec` is already a runtime dep of typia; pnpm's strict
mode hides transitives, so generated code's `import type { StandardSchemaV1 }`
requires you list it as a direct install.

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

```typescript
import { defineConfig } from '@hey-api/openapi-ts';
import { defineConfig as defineORPCConfig } from '@ahmedrowaihi/openapi-ts-orpc';
import {
  defineConfig as defineTypiaConfig,
  typiaTypeTransformer,
} from '@ahmedrowaihi/openapi-ts-typia';

export default defineConfig({
  input: 'openapi.json',
  output: { path: './src/generated' },
  plugins: [
    '@hey-api/typescript',
    {
      name: '@hey-api/transformers',
      typeTransformers: [typiaTypeTransformer],
    },
    defineTypiaConfig(),
    defineORPCConfig({
      validator: '@ahmedrowaihi/openapi-ts-typia',
      // ... rest of your config
    }),
  ],
});
```

`typiaTypeTransformer` annotates generated TypeScript types with typia
constraint tags (see [table below](#what-the-transformer-does)) so the
emitted `createValidate<T>()` calls enforce those constraints.

## OpenAPI spec generation

The typia plugin emits a plain JSON Schema twin per operation alongside
each validator:

```ts
export const tGetUserData: StandardSchemaV1<...> = createValidate<...>();
export const tGetUserDataJsonSchema = typiaSchemas.schemas[0];
```

For oRPC's OpenAPI generator, write a small `ConditionalSchemaConverter`
that pairs the validator with its twin and registers both with
`SmartCoercionPlugin`:

```typescript
import { createTypiaConverter } from './lib/typia-converter'
import { ZodToJsonSchemaConverter } from '@orpc/zod'

new SmartCoercionPlugin({
  schemaConverters: [
    new ZodToJsonSchemaConverter(),
    createTypiaConverter(),
  ],
})
```

The converter is a thin wrapper — it detects validators produced by
typia (via `'~standard'.vendor === 'typia'`) and returns the companion
JSON Schema symbol by naming convention (`${validatorName}JsonSchema`).

## What the transformer does

`typiaTypeTransformer` annotates TypeScript types with Typia constraint
tags derived from your OpenAPI schema:

| OpenAPI constraint | Typia tag |
|---|---|
| `minLength` / `maxLength` | `MinLength<N>` / `MaxLength<N>` |
| `pattern` | `Pattern<"...">` |
| `format` | `Format<"...">` |
| `minimum` / `maximum` | `Minimum<N>` / `Maximum<N>` |
| `exclusiveMinimum` / `exclusiveMaximum` | `ExclusiveMinimum<N>` / `ExclusiveMaximum<N>` |
| `multipleOf` | `MultipleOf<N>` |
| `minItems` / `maxItems` | `MinItems<N>` / `MaxItems<N>` |
| `uniqueItems` | `UniqueItems` |
| integer `format` (int32, int64, …) | `Type<"int32">` etc. |

## Error responses

4xx/5xx responses get per-status validators. Generated contracts wire
them automatically:

```ts
export const GetUserContract = oc.route({...})
  .input(tGetUserData)
  .output(tGetUserResponse)
  .errors({
    404: { data: tGetUserResponseError404 },
    500: { data: tGetUserResponseError500 },
  });
```
