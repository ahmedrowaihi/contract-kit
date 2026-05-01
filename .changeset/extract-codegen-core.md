---
"@ahmedrowaihi/codegen-core": minor
"@ahmedrowaihi/oas-core": major
"@ahmedrowaihi/openapi-go": patch
"@ahmedrowaihi/openapi-kotlin": patch
"@ahmedrowaihi/openapi-swift": patch
---

Extract spec-agnostic primitives (identifier transforms, filesystem safety) into new `@ahmedrowaihi/codegen-core`. `oas-core` no longer re-exports them — consumers must import `pascal`, `camel`, `safeIdent`, `safeCaseName`, `synthName`, `assertSafeOutputDir`, `defaultProjectName` from `@ahmedrowaihi/codegen-core` directly.
