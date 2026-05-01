# @ahmedrowaihi/openapi-typescript

## 0.2.0

### Minor Changes

- 26296d2: Add spec normalization pipeline (`normalizeSpec`) — passes for allOf collapse, inline-enum dedup, structural object dedup (opt-in), and scoped prune. Each generator gains a `normalize?: boolean | NormalizeOptions` option (`true` = safe preset). `sdk-regen` action gains a `normalize` input.

### Patch Changes

- Updated dependencies [16676d9]
- Updated dependencies [26296d2]
  - @ahmedrowaihi/oas-core@1.0.0

## 0.1.0

### Minor Changes

- 505cb40: Initial release. Thin programmatic wrapper around `@hey-api/openapi-ts` exposing a `generate({ input, output, plugins?, heyApi? })` matching the shape of `@ahmedrowaihi/openapi-{go,kotlin,swift}`. Default plugin set is `@hey-api/client-fetch` + `@hey-api/typescript` + `@hey-api/sdk` — full hey-api plugin ecosystem reachable via the `plugins` override (validators, Faker, TanStack Query, oRPC, etc.) and arbitrary `UserConfig` fields via `heyApi:` pass-through. Result shape matches our other generators (`{ output, files: [{path}] }`) so the `sdk-regen` action and downstream tooling can iterate the four packages uniformly.

  No new TypeScript codegen — the entire pipeline is hey-api's. This package only normalises the calling convention.
