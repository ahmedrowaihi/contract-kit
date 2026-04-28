---
"@ahmedrowaihi/openapi-recon": patch
---

Drop `@hey-api/shared` peer dep — `applyNaming` was the only call site and was inlined as a tiny camelCase helper. Removes a Node-only `process.env` access at module load, so the package now works in browsers / extension contexts without shims.
