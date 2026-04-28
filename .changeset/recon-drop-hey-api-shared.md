---
"@ahmedrowaihi/openapi-recon": minor
---

Add `Recon.originStats()` and `toOpenAPI({ origin })` so consumers can produce one spec per backend instead of a single multi-origin doc. Also drop the `@hey-api/shared` peer dep (inlined the one helper used) — package now works in browsers without shims.
