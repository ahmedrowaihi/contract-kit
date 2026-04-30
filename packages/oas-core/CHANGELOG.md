# @ahmedrowaihi/oas-core

## 0.1.0

### Minor Changes

- c197c34: Extract shared building blocks of the native-SDK generators into a new `@ahmedrowaihi/oas-core` package: `pascal` / `camel` / `safeIdent` / `safeCaseName` / `synthName` identifier transforms, `refName` / `isMeaningless`, `extractSecuritySchemeNames` walker + `securityKey`, HTTP / media-type constants (`HTTP_METHODS`, `HTTP_METHOD_LITERAL`, `JSON_MEDIA_RE`, `MULTIPART_FORM_MEDIA`, `FORM_URLENCODED_MEDIA`), and `assertSafeOutputDir` / `defaultProjectName`. The three SDK generators now consume those from `oas-core` instead of byte-duplicating them. No public-API changes for the generators — `securityKey` is no longer re-exported from each generator's IR module since it lives in `oas-core` directly; consumers who imported it should switch to `import { securityKey } from "@ahmedrowaihi/oas-core"`.
