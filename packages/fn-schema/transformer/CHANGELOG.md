# @ahmedrowaihi/fn-schema-transformer

## 0.2.0

### Minor Changes

- f0eb7ee: New package: TypeScript transformer that inlines fn-schema results at compile time. Reads a pre-extracted bundle and replaces `schemaOf(fn)` / `inputSchemaOf(fn)` / `outputSchemaOf(fn)` calls (from the `/runtime` subpath) with literal JSON Schema objects, so consuming code pays zero runtime cost. Pairs with ts-patch.

### Patch Changes

- Updated dependencies [f0eb7ee]
- Updated dependencies [2cf7ea6]
- Updated dependencies [f0eb7ee]
  - @ahmedrowaihi/fn-schema-core@0.2.0
  - @ahmedrowaihi/fn-schema-typescript@0.2.0
