---
"@ahmedrowaihi/openapi-recon": minor
---

Add `Recon.originStats()`, `toOpenAPI({ origin })`, and `clearOrigin(origin)` so consumers can produce one spec per backend and selectively drop origins. Also drop the `@hey-api/shared` peer dep (inlined the one helper used) — package now works in browsers without shims.
