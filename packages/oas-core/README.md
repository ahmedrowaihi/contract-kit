# @ahmedrowaihi/oas-core

Foundational helpers shared by the native-client SDK generators in [contract-kit](https://github.com/ahmedrowaihi/contract-kit) — used by [`@ahmedrowaihi/openapi-go`](../openapi-go), [`@ahmedrowaihi/openapi-kotlin`](../openapi-kotlin), and [`@ahmedrowaihi/openapi-swift`](../openapi-swift).

Not intended for direct consumption — the API surface here is whatever the three SDK generators happen to need in common, and may shift as new generators land.

## What's in scope

- **`pascal` / `camel` / `safeIdent` / `safeCaseName` / `synthName`** — pure string transforms (no reserved-word handling). Each generator layers its own `paramIdent` / `exportedIdent` / `enumEntryIdent` on top.
- **`refName` / `isMeaningless`** — turn `#/components/schemas/Foo` into `Foo`; flag empty / unknown / void schemas.
- **`extractSecuritySchemeNames` / `securityKey`** — walk the raw bundled spec to recover scheme names per (path, method), since hey-api's IR drops them.
- **`HTTP_METHODS` / `HTTP_METHOD_LITERAL` / `JSON_MEDIA_RE` / `MULTIPART_FORM_MEDIA` / `FORM_URLENCODED_MEDIA`** — canonical constants.
- **`assertSafeOutputDir` / `defaultProjectName`** — filesystem guardrails for the `clean: true` rm path, plus a sensible default for `rootProject.name` / `Package(name:)`.

## What's *not* in scope

- Per-language reserved-word sets, visibility rules, or DSL builders.
- Schema → decl translation (`schemasToDecls`) and the per-tag interface orchestration loop. They're structurally identical across generators but tightly coupled to per-language Decl types — sharing them would require parameterising over every DSL builder, which obscures more than it dedupes.

## Install

```bash
pnpm add @ahmedrowaihi/oas-core @hey-api/shared
```

`@hey-api/shared` is a peer dep so the IR types stay aligned with the generator's own version.
