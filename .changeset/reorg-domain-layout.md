---
"@ahmedrowaihi/openapi-core": major
"@ahmedrowaihi/asyncapi-core": major
"@ahmedrowaihi/asyncapi-typescript": patch
"@ahmedrowaihi/codegen-core": patch
"@ahmedrowaihi/openapi-tools": patch
"@ahmedrowaihi/openapi-go": patch
"@ahmedrowaihi/openapi-kotlin": patch
"@ahmedrowaihi/openapi-swift": patch
"@ahmedrowaihi/openapi-typescript": patch
"@ahmedrowaihi/openapi-recon": patch
"@ahmedrowaihi/openapi-ts-orpc": patch
"@ahmedrowaihi/openapi-ts-faker": patch
"@ahmedrowaihi/openapi-ts-paths": patch
"@ahmedrowaihi/openapi-ts-typia": patch
---

Renamed `@ahmedrowaihi/oas-core` to `@ahmedrowaihi/openapi-core`; merged `@ahmedrowaihi/aas-core` and `@ahmedrowaihi/asyncapi-tools` into a single `@ahmedrowaihi/asyncapi-core`. Repository layout regrouped under `packages/{shared,openapi,asyncapi}/*`; `asyncapi-typescript` split its internal `lib/` into `runtime/` and `ast/`.
