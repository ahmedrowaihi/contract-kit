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
- **`@ahmedrowaihi/openapi-kotlin`** — Android / JVM Kotlin SDK generator: OkHttp + kotlinx-serialization + suspend, with multipart/form/binary body support, per-call options, composable interceptors, typed errors, multi-2xx sum-type returns, and per-op security auto-wiring.
- **`@ahmedrowaihi/openapi-swift`** — iOS Swift SDK generator: protocols + `Codable` structs + URLSession-backed async-throws impls. Same feature surface as `openapi-kotlin`.

## Planned

- **`@ahmedrowaihi/openapi-go`** — third native-client generator. Same shape as kotlin/swift (IR → AST → printer pipeline, runtime helpers, per-call options, multi-2xx returns), idiomatic = stdlib `net/http` + `encoding/json` (zero deps), `context.Context` for cancellation/timeout, generics for `Execute[T]`. Strategic value: third data point that tells us whether to extract a shared "SDK contract IR" between the language packages.

## Considered, declined

- **`openapi-drift`** — was queued (compare committed spec vs runtime-observed via recon, ship as CLI + GH Action). Declined because `@ahmedrowaihi/openapi-tools/diff` already covers the comparison; the wrapper would mostly be plumbing. Revisit only if there's clear demand for the CI ergonomics.
- **API gateway / aggregator** — crowded space (Kong, Apollo Federation, tRPC). No clear differentiation without going much bigger than this monorepo's scope.
- **Spec registry / hosted SaaS** — out of scope; needs infra and ongoing ops.
- **Generic API testing** — surface too broad; many existing tools.

## Maintenance / cross-cutting

- **Shared codegen utilities (between native generators).** `openapi-kotlin` and `openapi-swift` byte-duplicate `constants.ts`, `ref.ts`, `identifiers.ts` core helpers, the `extractSecuritySchemeNames` walker, and the orchestration loop in `operations.ts`. Extract into a small `openapi-codegen-shared` once Go lands so we have three data points instead of two.
- **SDK contract IR.** A heavier refactor: an intermediate AST between hey-api's IR and per-language DSLs, capturing tag → interface, op signatures with abstract types, body strategy, multi-2xx shape. Defer until at least one more language ships — two languages aren't enough to validate the abstraction.

## Glean polish (incremental)

- Request/response examples surfaced through Scalar (recon → emit `examples`).
- Enum detection (low-cardinality string fields) + `$ref` deduplication for shared object shapes.
- Smarter prefix detection so `/api/v1/episodes` and `/api/v1/users` share a `servers[]` prefix.
- Multi-tab capture (one panel state per inspected page is the current limit).
