# @ahmedrowaihi/openapi-ts-typia

Typia plugin for [@hey-api/openapi-ts](https://heyapi.dev/). Emits
[typia](https://typia.io/) Standard Schema validators + JSON Schema
companions for OpenAPI operations.

## Install

```bash
pnpm add -d @ahmedrowaihi/openapi-ts-typia @hey-api/openapi-ts
pnpm add typia @standard-schema/spec
```

`@standard-schema/spec` is already a runtime dep of typia; pnpm's
strict mode hides transitives, so generated code's
`import type { StandardSchemaV1 } from '@standard-schema/spec'`
requires the user to list it as a direct install.

Typia's compiler transform is required at build time — install
`@ryoppippi/unplugin-typia` for your bundler (Vite, Webpack, tsdown,
etc.).

## Usage

```typescript
import { defineConfig } from '@hey-api/openapi-ts';
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
  ],
});
```

`typiaTypeTransformer` annotates generated TypeScript types with typia
constraint tags (`MinLength<N>`, `Format<"email">`, etc.) derived from
OpenAPI validation keywords.

## Generated output

For each operation, one Standard Schema validator and (when
`jsonSchema: true`) one JSON Schema companion:

```ts
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { createValidate, type IValidation, json } from 'typia';
import type { GetUserData, GetUserResponse } from './types.gen';

const typiaSchemas = json.schemas<[
  Omit<GetUserData, 'url' | 'path'> & { params: GetUserData['path'] },
  GetUserResponse,
]>();

export const tGetUserData:
  StandardSchemaV1<
    Omit<GetUserData, 'url' | 'path'> & { params: GetUserData['path'] },
    Omit<GetUserData, 'url' | 'path'> & { params: GetUserData['path'] }
  > &
  ((input: unknown) => IValidation<Omit<GetUserData, 'url' | 'path'> & { params: GetUserData['path'] }>) =
  createValidate<Omit<GetUserData, 'url' | 'path'> & { params: GetUserData['path'] }>();

export const tGetUserDataJsonSchema = typiaSchemas.schemas[0];

export const tGetUserResponse:
  StandardSchemaV1<GetUserResponse, GetUserResponse> &
  ((input: unknown) => IValidation<GetUserResponse>) =
  createValidate<GetUserResponse>();
export const tGetUserResponseJsonSchema = typiaSchemas.schemas[1];
```

- `typia.json.schemas<[T1, T2, ...]>()` is called once per output file;
  typia deduplicates `$ref`-ed components across the tuple.
- Request input is reshaped: `path` → `params` to match the standard
  validator API's default layer mapping (same shape oRPC's
  `inputStructure: 'detailed'` expects).
- Error responses (4xx/5xx) get per-status validators:
  `t{{op}}ResponseError400`, etc.

## Configuration

```ts
defineTypiaConfig({
  case: 'camelCase',    // naming case for validators (default)
  comments: true,       // JSDoc from OpenAPI summary/description
  jsonSchema: true,     // emit JSON Schema companions
  requests: {
    enabled: true,
    name: 't{{name}}Data',
    jsonName: 't{{name}}DataJsonSchema',
  },
  responses: {
    enabled: true,
    name: 't{{name}}Response',
    jsonName: 't{{name}}ResponseJsonSchema',
  },
})
```

## Drift detection

Typia's tag namespace is type-only — it can't be enumerated at
runtime. This plugin ships a generated mirror at
`shared/typia-tags.generated.ts` produced by
`scripts/sync-tags.ts`. Run after bumping typia:

```bash
pnpm sync-tags
```

The generator walks typia's `.d.ts` files via the TypeScript compiler
API to extract tag names + `Format.Value` + `Type<V>`'s constraint —
no hand-maintained mapping tables.

A compile-time coverage gate flags any new typia tag that isn't
explicitly handled or skipped.

## Requirements

- `@hey-api/openapi-ts` >= 0.95.0
- `@hey-api/typescript` plugin configured
- `@hey-api/transformers` plugin configured with
  `typeTransformers: [typiaTypeTransformer]`
- `typia` + `@standard-schema/spec` installed at runtime
- Typia compiler transform configured (via `@ryoppippi/unplugin-typia`
  or equivalent)
