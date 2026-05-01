---
"@ahmedrowaihi/asyncapi-typescript": minor
---

Cross-file imports now go through codegen-core's File graph instead of being inlined as `ts.factory.createImportDeclaration` nodes. Plugins declare imports via `plugin.emitTs({ imports: [{ from: "events.gen", names: [{ name: "Events" }] }] })`; the renderer reads `file.imports` and computes relative module specifiers at print time, surviving file moves and rename collisions. Replaces the inline `importNamedFrom` helper (removed) and the `attach-header` mutation (replaced with a header side channel keyed by logical path).
