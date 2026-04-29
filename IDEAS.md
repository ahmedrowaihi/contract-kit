# Ideas

Loose roadmap. Not a commitment — order shifts with whatever's actually useful.

## Shipped

- **`@ahmedrowaihi/openapi-ts-orpc`** — `@hey-api/openapi-ts` plugin emitting oRPC contracts.
- **`@ahmedrowaihi/openapi-ts-faker`** — `@hey-api/openapi-ts` plugin emitting `@faker-js/faker` mock factories from schemas.
- **`@ahmedrowaihi/openapi-ts-typia`** — `@hey-api/openapi-ts` plugin emitting typia validators.
- **`@ahmedrowaihi/openapi-ts-paths`** — `@hey-api/openapi-ts` plugin emitting per-operation route consts.
- **`@ahmedrowaihi/openapi-tools`** — runtime helpers (`/match`, `/parse`, `/diff`, `/ir`, `/router`, `/merge`).
- **`@ahmedrowaihi/openapi-recon`** — reverse-engineer an OpenAPI 3.1 spec from observed `Request`/`Response` traffic.
- **`@ahmedrowaihi/glean`** — DevTools extension that uses `openapi-recon` to emit live specs from browsing.
- **`@ahmedrowaihi/openapi-kotlin`** — Android Kotlin SDK generator: Retrofit + kotlinx-serialization + suspend, with multipart/form/binary body support. Walks the hey-api IR so 2.0/3.0/3.1 inputs all produce the same output. Plan: [docs/plans/native-clients.md](docs/plans/native-clients.md).
- **`@ahmedrowaihi/openapi-swift`** — iOS Swift SDK generator: protocols (one per tag) + `Codable` structs + async-throws funcs. Same IR pipeline + module shape as `openapi-kotlin`. Phase 2 of the native-clients plan.

## Planned

## Deferred

- **`openapi-drift`** — compare a committed spec against a runtime-observed one (via recon). CLI + GitHub Action + optional Glean panel. *Reason for defer:* useful but waiting until merge lands first; merge unblocks better drift inputs (compare merged source-of-truth vs runtime).

## Considered, declined

- **API gateway / aggregator** — crowded space (Kong, Apollo Federation, tRPC). No clear differentiation without going much bigger than this monorepo's scope.
- **Spec registry / hosted SaaS** — out of scope; needs infra and ongoing ops.
- **Generic API testing** — surface too broad; many existing tools.

## Glean polish (incremental)

- Request/response examples surfaced through Scalar (recon → emit `examples`).
- Enum detection (low-cardinality string fields) + `$ref` deduplication for shared object shapes.
- Smarter prefix detection so `/api/v1/episodes` and `/api/v1/users` share a `servers[]` prefix.
- Multi-tab capture (one panel state per inspected page is the current limit).
- Glean README + screenshot.
