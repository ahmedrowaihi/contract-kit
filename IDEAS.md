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
- **`@ahmedrowaihi/openapi-go`** — Go SDK generator: stdlib-only (`net/http` + `encoding/json` + `mime/multipart`), `context.Context`-first signatures, generics `Execute[T]`, per-tag interfaces with `*WithResponse` companions, sealed-style sum types via marker interface + concrete cases for multi-2xx ops.
- **`@ahmedrowaihi/oas-core`** — shared building blocks for native-SDK generators: identifier transforms, ref helpers, `extractSecuritySchemeNames` walker, HTTP / media constants, filesystem safety. Excludes language-coupled bits (schema → decl translation, per-tag orchestration loop) — those remain per-package because parameterising over every DSL builder obscures more than it dedupes.
- **`actions/sdk-regen` GitHub Action** — composite, regenerates a Go / Kotlin / Swift SDK on dispatch / push and either commits back, opens a PR, or leaves the diff. Polymorphic `manifest` input emits `go.mod` / Gradle files / `Package.swift` per target. Tagged `sdk-regen-v1`.
- **`contract-kit-mux-demo` repo** — multi-language Mux SDK demo consuming the action via `workflow_dispatch` + per-language PR strategy. First public dogfood.

## Planned

- **CI guard for `examples/petstore-sdk/`** — run `pnpm gen:go|kotlin|swift` and `git diff --exit-code` on every PR. Fails CI when a generator change forgets to regen the example. Cheap, no published-version coupling.
- **Real-world spec sweep** — Stripe, GitHub, OpenAI, Slack against all three generators in CI. Mux alone surfaced 2 bugs; a wider sweep would catch the long tail before users do.
- **Mirror `sdk-regen` to a standalone repo** — only worth it for GitHub Marketplace listing, which requires `action.yml` at repo root. Defer until there's pull from outside contract-kit.

## Considered, declined

- **`openapi-drift`** — was queued (compare committed spec vs runtime-observed via recon, ship as CLI + GH Action). Declined because `@ahmedrowaihi/openapi-tools/diff` already covers the comparison; the wrapper would mostly be plumbing. Revisit only if there's clear demand for the CI ergonomics.
- **API gateway / aggregator** — crowded space (Kong, Apollo Federation, tRPC). No clear differentiation without going much bigger than this monorepo's scope.
- **Spec registry / hosted SaaS** — out of scope; needs infra and ongoing ops.
- **Generic API testing** — surface too broad; many existing tools.

## Maintenance / cross-cutting

- **SDK contract IR.** A heavier refactor: an intermediate AST between hey-api's IR and per-language DSLs, capturing tag → interface, op signatures with abstract types, body strategy, multi-2xx shape. Held off on after the `oas-core` extraction landed — the structurally-identical `schemasToDecls` and per-tag orchestration loop turned out to be too tightly coupled to per-language Decl types to share without a heavier abstraction. Revisit if a fourth language target ships and the duplication cost outweighs the abstraction cost.

## Glean polish (incremental)

- Request/response examples surfaced through Scalar (recon → emit `examples`).
- Enum detection (low-cardinality string fields) + `$ref` deduplication for shared object shapes.
- Smarter prefix detection so `/api/v1/episodes` and `/api/v1/users` share a `servers[]` prefix.
- Multi-tab capture (one panel state per inspected page is the current limit).
