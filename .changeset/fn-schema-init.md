---
"@ahmedrowaihi/fn-schema-core": minor
"@ahmedrowaihi/fn-schema-typescript": minor
"@ahmedrowaihi/fn-schema-cli": minor
---

New track. Extracts JSON Schemas for function inputs and outputs from TypeScript source. `core` defines the language-agnostic IR + Extractor contract + emitters (files, bundle, OpenAPI 3.1 components); `typescript` walks source via ts-morph, resolves type identifiers (named/default/namespace imports, cross-file refs), synthesizes virtual aliases, and runs ts-json-schema-generator over a shared program. Supports overloads (first/last/merge), `this`-param skip, default-export arrows, object-literal methods, generic skip/erase, and JSDoc-tag naming. CLI is a citty + c12 + fast-glob wrapper.
