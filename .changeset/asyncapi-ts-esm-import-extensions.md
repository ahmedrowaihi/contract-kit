---
"@ahmedrowaihi/asyncapi-typescript": patch
---

Generate `handlers.gen.ts` via `ts.factory` instead of copying a `.template.ts` file from `bundle/` — bundles now hold only pure-static runtime per the hey-api convention. Also adds explicit `.js` extensions to all relative imports in the package source so the published tarball resolves cleanly under Node ESM.
