# @ahmedrowaihi/fn-schema-typescript

## 0.2.1

### Patch Changes

- Updated dependencies [dbaeb22]
  - @ahmedrowaihi/fn-schema-core@0.3.0

## 0.2.0

### Minor Changes

- f0eb7ee: Coverage pass: TS types that don't trip JSON Schema natively (Date, URL, RegExp, File, Blob, Buffer, Uint8Array, ArrayBuffer, bigint, branded aliases) now emit canonical schemas via a sentinel-and-rewrite pipeline. Adds `extract({ schema: { typeMappers } })` to override or extend mappings, plus `TYPE_MAPPED` / `LOSSY_MAPPING` / `NOT_REPRESENTABLE` diagnostics so every mapping decision is visible. Branded types (`type X = string & { __brand: "X" }`) keep their identity through the brand name and lose the phantom property.
- 2cf7ea6: New track. Extracts JSON Schemas for function inputs and outputs from TypeScript source. `core` defines the language-agnostic IR + Extractor contract + emitters (files, bundle, OpenAPI 3.1 components); `typescript` walks source via ts-morph, resolves type identifiers (named/default/namespace imports, cross-file refs), synthesizes virtual aliases, and runs ts-json-schema-generator over a shared program. Supports overloads (first/last/merge), `this`-param skip, default-export arrows, object-literal methods, generic skip/erase, and JSDoc-tag naming. CLI is a citty + c12 + fast-glob wrapper.

### Patch Changes

- Updated dependencies [f0eb7ee]
- Updated dependencies [2cf7ea6]
- Updated dependencies [f0eb7ee]
  - @ahmedrowaihi/fn-schema-core@0.2.0
