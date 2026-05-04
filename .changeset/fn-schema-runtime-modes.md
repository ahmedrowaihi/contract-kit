---
"@ahmedrowaihi/fn-schema-core": minor
"@ahmedrowaihi/fn-schema-cli": minor
---

CLI gains `--watch` (chokidar + warm Project) and `--bundle-types` (emits a sibling `.ts` wrapper that re-exports the JSON bundle under literal-typed signature ids and definition names). New `emit.toBundleTypesModule(result, { jsonImport })` powers the wrapper.
