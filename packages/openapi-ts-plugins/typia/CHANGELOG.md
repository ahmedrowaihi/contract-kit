# Changelog

## 3.0.0

### Major Changes

- [#2](https://github.com/ahmedrowaihi/contract-kit/pull/2) [`c10d0a0`](https://github.com/ahmedrowaihi/contract-kit/commit/c10d0a03fd11ca505b317624e51ad330df67c978) Thanks [@ahmedrowaihi](https://github.com/ahmedrowaihi)! - Unified versioning under contract-kit 3.0. All hey-api plugins now share a version (`fixed` lockstep) and ship from a single monorepo. faker and typia jump from 0.x; orpc moves from 2.x. No runtime API change — the version reset is the change.

  Old standalone packages (`@ahmedrowaihi/openapi-ts-{faker,typia}` from their original repos) will be deprecated post-release with pointers here.

All notable changes to `@ahmedrowaihi/openapi-ts-typia` are documented here.

## [0.2.0](https://github.com/ahmedrowaihi/openapi-ts-typia-plugin/releases/tag/v0.2.0)

New `/orpc` subpath — drop-in coercion for oRPC's `SmartCoercionPlugin`:

```typescript
import * as typiaGen from "./generated/.../openapi-ts-typia.gen";
import { SmartCoercionPlugin } from "@orpc/json-schema";
import { createTypiaSchemaConverter } from "@ahmedrowaihi/openapi-ts-typia/orpc";

new SmartCoercionPlugin({
  schemaConverters: [createTypiaSchemaConverter(typiaGen)],
});
```

**Breaking**: request-input `body` / `query` / `headers` widen to `unknown` when the operation doesn't declare them (previously `never`). Operations with a declared schema are unchanged.

## [0.1.0](https://github.com/ahmedrowaihi/openapi-ts-typia-plugin/releases/tag/v0.1.0) — Initial release

```typescript
import { defineConfig } from "@hey-api/openapi-ts";
import {
  defineConfig as defineTypiaConfig,
  typiaTypeTransformer,
} from "@ahmedrowaihi/openapi-ts-typia";

export default defineConfig({
  input: "openapi.json",
  output: { path: "./src/generated" },
  plugins: [
    "@hey-api/typescript",
    {
      name: "@hey-api/transformers",
      typeTransformers: [typiaTypeTransformer],
    },
    defineTypiaConfig(),
  ],
});
```

### Requirements

- `@hey-api/openapi-ts` >= 0.95.0
- `typia` ^12
- `@standard-schema/spec` ^1
- Typia compiler transform configured (via `@ryoppippi/unplugin-typia`
  or equivalent)
