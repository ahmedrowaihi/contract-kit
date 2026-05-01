# @ahmedrowaihi/openapi-ts-paths

## 1.0.0

### Major Changes

- 5d66302: **New plugin `@ahmedrowaihi/openapi-ts-paths`** — emits one runtime `const` per operation (named after the operationId, suffixed `Route`) holding `{ spec, pattern, method, operationId }`. Per-operation exports keep the codegen output tree-shakable: `import { getPetByIdRoute } from "./generated/paths.gen"` pulls just that route.

  **`@ahmedrowaihi/openapi-tools` adds runtime routing** — pure, tree-shakable, accepts standard `Request`. Subpath exports:

  - `/match` → `match(routes, request)` returns a discriminated union typed by the route array, `isInSpec(routes, request)` boolean check
  - `/router` → `createRouter().on(route, handler).handle(request)` for typed handler dispatch (no upfront array; routes accumulate as you register)
  - `/parse`, `/diff`, `/ir` for spec parsing, diffing, and extracting `Route[]` from a parsed IR (backend dynamic-spec flow)
  - `sideEffects: false` for clean tree-shaking
