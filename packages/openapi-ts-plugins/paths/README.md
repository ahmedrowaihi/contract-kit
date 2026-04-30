# @ahmedrowaihi/openapi-ts-paths

Per-operation route consts emitted from an OpenAPI spec — spec template, URLPattern-style pattern, method, and operationId, ready for tree-shakable runtime routing and matching. Plugin for [`@hey-api/openapi-ts`](https://heyapi.dev).

## Install

```bash
npm install -D @ahmedrowaihi/openapi-ts-paths @hey-api/openapi-ts
```

## Use

```ts
import { defineConfig } from "@hey-api/openapi-ts";
import { defineConfig as definePathsConfig } from "@ahmedrowaihi/openapi-ts-paths";

export default defineConfig({
  input: "openapi.yaml",
  output: { path: "./generated" },
  plugins: [
    "@hey-api/typescript",
    definePathsConfig({
      output: "paths",                // → generated/paths.ts
      naming: { casing: "camelCase", suffix: "Route" },
    }),
  ],
});
```

## Output

For each operation that has a `path` and an `operationId`, the plugin emits:

```ts
export const getPetByIdRoute = {
  spec: "/pets/{id}",
  pattern: "/pets/:id",
  method: "get",
  operationId: "getPetById",
} as const;
```

- `spec` — the original `{param}` template, useful when re-issuing the request.
- `pattern` — `:param` form, ready to feed `URLPattern`, `path-to-regexp`, your router of choice.
- `method` — lower-case verb.
- `operationId` — the OpenAPI id when present.

`as const` keeps every value literal-typed so downstream code can narrow on `route.method`, etc.

## Why route consts (instead of runtime routing)

Tree-shakable: only the routes you import end up in the bundle. Pair with the matchers in [`@ahmedrowaihi/openapi-tools`](../../openapi-tools) for client-side dispatch:

```ts
import { match } from "@ahmedrowaihi/openapi-tools/match";
import { getPetByIdRoute } from "./generated/paths";

const params = match(getPetByIdRoute.pattern, "/pets/42"); // { id: "42" }
```

Or feed them to a router framework that takes pattern strings.

## Options

```ts
definePathsConfig({
  output: "paths",                    // filename (no extension). Default: "paths"
  naming: {
    casing: "camelCase",              // any @hey-api/shared NamingRule | Casing
    suffix: "Route",                  // appended to each const name
  },
});
```

## License

MIT
