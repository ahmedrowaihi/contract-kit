---
"@ahmedrowaihi/oas-core": minor
"@ahmedrowaihi/openapi-go": minor
"@ahmedrowaihi/openapi-kotlin": minor
"@ahmedrowaihi/openapi-swift": minor
"@ahmedrowaihi/openapi-typescript": minor
---

Add spec normalization pipeline (`normalizeSpec`) — passes for allOf collapse, inline-enum dedup, structural object dedup (opt-in), and scoped prune. Each generator gains a `normalize?: boolean | NormalizeOptions` option (`true` = safe preset). `sdk-regen` action gains a `normalize` input.
