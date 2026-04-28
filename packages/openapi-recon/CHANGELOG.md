# @ahmedrowaihi/openapi-recon

## 1.0.0

### Major Changes

- d8bef10: New package. Reverse-engineer an OpenAPI 3.1 spec from observed HTTP traffic. Runtime-agnostic — accepts standard `Request` + `Response`, works in browsers, Node, edge runtimes, service workers.

  Inference covers:

  - Path templating with an ID-like heuristic (only templates segments where varying values look like IDs — `/users/me` won't collapse with `/users/123`).
  - JSON Schema 2020-12 inference from samples; `required` is the intersection across observations; PATCH bodies skip `required` (partial-update semantics).
  - String format detection (`uuid`, `email`, `date-time`, `date`, `uri`, `ipv4`); integer format (`int32`/`int64`) by range.
  - Auth scheme detection (Bearer, Basic, API key) → `components.securitySchemes` + per-operation `security`. Sensitive headers redacted from samples.

  Output round-trips cleanly through `@ahmedrowaihi/openapi-tools/parse` + `matchRequest`.
