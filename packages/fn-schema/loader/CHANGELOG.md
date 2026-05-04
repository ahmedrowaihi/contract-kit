# @ahmedrowaihi/fn-schema-loader

## 0.2.0

### Minor Changes

- f0eb7ee: New package: type-safe reader over fn-schema bundles. `createReader<T>(bundle)` exposes `get`/`has`/`resolve`/`resolveRef`/`inputOf`/`outputOf`/`findByIdentity`/`listSignatures`/`listDefinitions`. Generics over the bundle type infer literal-keyed lookups. Zero runtime dependencies — works in any JS runtime that can read JSON.

### Patch Changes

- Updated dependencies [f0eb7ee]
- Updated dependencies [2cf7ea6]
- Updated dependencies [f0eb7ee]
  - @ahmedrowaihi/fn-schema-core@0.2.0
