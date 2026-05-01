# @ahmedrowaihi/openapi-recon

## 1.1.1

### Patch Changes

- 5401075: Renamed `@ahmedrowaihi/oas-core` to `@ahmedrowaihi/openapi-core`; merged `@ahmedrowaihi/aas-core` and `@ahmedrowaihi/asyncapi-tools` into a single `@ahmedrowaihi/asyncapi-core`. Repository layout regrouped under `packages/{shared,openapi,asyncapi}/*`; `asyncapi-typescript` split its internal `lib/` into `runtime/` and `ast/`.

## 1.1.0

### Minor Changes

- 6292ee6: Add `Recon.originStats()`, `toOpenAPI({ origin })`, and `clearOrigin(origin)` so consumers can produce one spec per backend and selectively drop origins. Also drop the `@hey-api/shared` peer dep (inlined the one helper used) — package now works in browsers without shims.

## 1.0.0

### Major Changes

- d8bef10: New package. Reverse-engineer an OpenAPI 3.1 spec from observed HTTP traffic. Runtime-agnostic — accepts standard `Request` + `Response`, works in browsers, Node, edge runtimes, service workers.

  Inference covers:

  - Path templating with an ID-like heuristic (only templates segments where varying values look like IDs — `/users/me` won't collapse with `/users/123`).
  - JSON Schema 2020-12 inference from samples; `required` is the intersection across observations; PATCH bodies skip `required` (partial-update semantics).
  - String format detection (`uuid`, `email`, `date-time`, `date`, `uri`, `ipv4`); integer format (`int32`/`int64`) by range.
  - Auth scheme detection (Bearer, Basic, API key) → `components.securitySchemes` + per-operation `security`. Sensitive headers redacted from samples.

  Output round-trips cleanly through `@ahmedrowaihi/openapi-tools/parse` + `matchRequest`.
