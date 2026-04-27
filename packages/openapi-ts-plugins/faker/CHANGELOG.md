# @ahmedrowaihi/openapi-ts-faker

## 4.0.0

### Major Changes

- 8fec7d2: Extracted spec-host-agnostic tooling (diff + parse) from the `@ahmedrowaihi/openapi-ts-orpc/tools` subpath into a new top-level package `@ahmedrowaihi/openapi-tools`.

  Breaking change for orpc consumers using `import ... from "@ahmedrowaihi/openapi-ts-orpc/tools"` — switch to `@ahmedrowaihi/openapi-tools`. faker and typia bump alongside via lockstep; their APIs are unchanged.

## 3.0.0

### Major Changes

- Unified versioning under contract-kit 3.0. All hey-api plugins now share a version (`fixed` lockstep) and ship from a single monorepo. faker and typia jump from 0.x; orpc moves from 2.x. No runtime API change — the version reset is the change.

  Old standalone packages (`@ahmedrowaihi/openapi-ts-{faker,typia}` from their original repos) will be deprecated post-release with pointers here.
