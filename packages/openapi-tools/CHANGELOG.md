# @ahmedrowaihi/openapi-tools

## 1.0.0

### Major Changes

- 8fec7d2: Extracted spec-host-agnostic tooling (diff + parse) from the `@ahmedrowaihi/openapi-ts-orpc/tools` subpath into a new top-level package `@ahmedrowaihi/openapi-tools`.

  Breaking change for orpc consumers using `import ... from "@ahmedrowaihi/openapi-ts-orpc/tools"` — switch to `@ahmedrowaihi/openapi-tools`. faker and typia bump alongside via lockstep; their APIs are unchanged.
