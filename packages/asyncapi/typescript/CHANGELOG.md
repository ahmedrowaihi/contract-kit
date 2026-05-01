# @ahmedrowaihi/asyncapi-typescript

## 1.1.0

### Minor Changes

- 4f1c1a3: Cross-file imports now go through codegen-core's File graph instead of being inlined as `ts.factory.createImportDeclaration` nodes. Plugins declare imports via `plugin.emitTs({ imports: [{ from: "events.gen", names: [{ name: "Events" }] }] })`; the renderer reads `file.imports` and computes relative module specifiers at print time, surviving file moves and rename collisions. Replaces the inline `importNamedFrom` helper (removed) and the `attach-header` mutation (replaced with a header side channel keyed by logical path).

## 1.0.0

### Patch Changes

- 56f520e: Generate `handlers.gen.ts` via `ts.factory` instead of copying a `.template.ts` file from `bundle/` — bundles now hold only pure-static runtime per the hey-api convention. Also adds explicit `.js` extensions to all relative imports in the package source so the published tarball resolves cleanly under Node ESM.
- 5401075: Renamed `@ahmedrowaihi/oas-core` to `@ahmedrowaihi/openapi-core`; merged `@ahmedrowaihi/aas-core` and `@ahmedrowaihi/asyncapi-tools` into a single `@ahmedrowaihi/asyncapi-core`. Repository layout regrouped under `packages/{shared,openapi,asyncapi}/*`; `asyncapi-typescript` split its internal `lib/` into `runtime/` and `ast/`.
- Updated dependencies [5401075]
  - @ahmedrowaihi/asyncapi-core@1.0.0
  - @ahmedrowaihi/codegen-core@0.2.1
