---
"@ahmedrowaihi/openapi-ts-orpc": major
"@ahmedrowaihi/openapi-ts-faker": major
"@ahmedrowaihi/openapi-ts-typia": major
"@ahmedrowaihi/openapi-tools": major
---

Extracted spec-host-agnostic tooling (diff + parse) from the `@ahmedrowaihi/openapi-ts-orpc/tools` subpath into a new top-level package `@ahmedrowaihi/openapi-tools`.

Breaking change for orpc consumers using `import ... from "@ahmedrowaihi/openapi-ts-orpc/tools"` — switch to `@ahmedrowaihi/openapi-tools`. faker and typia bump alongside via lockstep; their APIs are unchanged.
