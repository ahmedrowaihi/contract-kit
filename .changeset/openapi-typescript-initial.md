---
"@ahmedrowaihi/openapi-typescript": minor
---

Initial release. Thin programmatic wrapper around `@hey-api/openapi-ts` exposing a `generate({ input, output, plugins?, heyApi? })` matching the shape of `@ahmedrowaihi/openapi-{go,kotlin,swift}`. Default plugin set is `@hey-api/client-fetch` + `@hey-api/typescript` + `@hey-api/sdk` — full hey-api plugin ecosystem reachable via the `plugins` override (validators, Faker, TanStack Query, oRPC, etc.) and arbitrary `UserConfig` fields via `heyApi:` pass-through. Result shape matches our other generators (`{ output, files: [{path}] }`) so the `sdk-regen` action and downstream tooling can iterate the four packages uniformly.

No new TypeScript codegen — the entire pipeline is hey-api's. This package only normalises the calling convention.
