---
"@ahmedrowaihi/fn-schema-loader": minor
---

New package: type-safe reader over fn-schema bundles. `createReader<T>(bundle)` exposes `get`/`has`/`resolve`/`resolveRef`/`inputOf`/`outputOf`/`findByIdentity`/`listSignatures`/`listDefinitions`. Generics over the bundle type infer literal-keyed lookups. Zero runtime dependencies — works in any JS runtime that can read JSON.
