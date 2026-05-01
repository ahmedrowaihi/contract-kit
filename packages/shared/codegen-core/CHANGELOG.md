# @ahmedrowaihi/codegen-core

## 0.2.0

### Minor Changes

- 16676d9: Extract spec-agnostic primitives (identifier transforms, filesystem safety) into new `@ahmedrowaihi/codegen-core`. `oas-core` no longer re-exports them — consumers must import `pascal`, `camel`, `safeIdent`, `safeCaseName`, `synthName`, `assertSafeOutputDir`, `defaultProjectName` from `@ahmedrowaihi/codegen-core` directly.
