# @ahmedrowaihi/fn-schema-cli

## 0.3.0

### Minor Changes

- dbaeb22: Adds `scan`, `inspect`, `browse`, `diff` subcommands. Bare `fn-schema <patterns>` now routes through `extract`.

  ```bash
  # list functions without generating schemas
  fn-schema scan 'src/**/*.ts'

  # resolved input/output schema for one function
  fn-schema inspect createUser 'src/api/**/*.ts'

  # interactive picker → print / bundle / files / openapi
  fn-schema browse 'src/**/*.ts'

  # bundle-vs-bundle diff (CI-friendly via --breaking-only)
  fn-schema diff old/schemas.json new/schemas.json --breaking-only

  # extract is now an explicit subcommand (still the default)
  fn-schema extract 'src/**/*.ts' --bundle generated/schemas.json --pretty
  ```

### Patch Changes

- Updated dependencies [dbaeb22]
  - @ahmedrowaihi/fn-schema-core@0.3.0
  - @ahmedrowaihi/fn-schema-typescript@0.2.1

## 0.2.0

### Minor Changes

- 2cf7ea6: New track. Extracts JSON Schemas for function inputs and outputs from TypeScript source. `core` defines the language-agnostic IR + Extractor contract + emitters (files, bundle, OpenAPI 3.1 components); `typescript` walks source via ts-morph, resolves type identifiers (named/default/namespace imports, cross-file refs), synthesizes virtual aliases, and runs ts-json-schema-generator over a shared program. Supports overloads (first/last/merge), `this`-param skip, default-export arrows, object-literal methods, generic skip/erase, and JSDoc-tag naming. CLI is a citty + c12 + fast-glob wrapper.
- f0eb7ee: CLI gains `--watch` (chokidar + warm Project) and `--bundle-types` (emits a sibling `.ts` wrapper that re-exports the JSON bundle under literal-typed signature ids and definition names). New `emit.toBundleTypesModule(result, { jsonImport })` powers the wrapper.

### Patch Changes

- Updated dependencies [f0eb7ee]
- Updated dependencies [2cf7ea6]
- Updated dependencies [f0eb7ee]
  - @ahmedrowaihi/fn-schema-core@0.2.0
  - @ahmedrowaihi/fn-schema-typescript@0.2.0
