---
"@ahmedrowaihi/fn-schema-transformer": minor
---

New package: TypeScript transformer that inlines fn-schema results at compile time. Reads a pre-extracted bundle and replaces `schemaOf(fn)` / `inputSchemaOf(fn)` / `outputSchemaOf(fn)` calls (from the `/runtime` subpath) with literal JSON Schema objects, so consuming code pays zero runtime cost. Pairs with ts-patch.
