---
"@ahmedrowaihi/openapi-ts-paths": major
"@ahmedrowaihi/openapi-tools": minor
---

**New plugin `@ahmedrowaihi/openapi-ts-paths`** — emits a `paths.gen.ts` file with:
- `export type Paths = {...}` — structured type keyed by path + method, path params typed
- `export const r_<method>_<path>` — one named const per route (tree-shakable per-route imports)
- `export const ROUTES = [...]` — convenience aggregate

**`@ahmedrowaihi/openapi-tools` adds request matching**, all pure functions, tree-shakable subpath exports, frontend + backend friendly:
- `matchRequest(routes, req)` from `/match` — typed via `<TPaths>` generic
- `matchPath(routes, url)` from `/match` — path-only check
- `routesFromIR(ir)` from `/ir` — backend helper for dynamic specs
- subpath exports `/match`, `/parse`, `/diff`, `/ir`, `/route` — bundlers tree-shake unused families
- `sideEffects: false` — no top-level side effects, safe for frontend bundling
- hey-api peers (`@hey-api/codegen-core`, `@hey-api/shared`) made optional — only the `/parse`, `/diff`, `/ir` subpaths need them
