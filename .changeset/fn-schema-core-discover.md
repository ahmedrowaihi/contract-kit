---
"@ahmedrowaihi/fn-schema-core": minor
---

Adds `Project.discover()` — function listing without schema generation. Returns `FunctionInfo[]` plus diagnostics and stats; cheaper than `extract()` when you only need names/locations.

```ts
import { createProject } from "@ahmedrowaihi/fn-schema-core";
import { typescript } from "@ahmedrowaihi/fn-schema-typescript";

const project = createProject({ extractors: [typescript()] });
const { signatures } = await project.discover({ files: ["src/**/*.ts"] });
for (const fn of signatures) console.log(fn.name, fn.file, fn.location);
project.dispose();
```
