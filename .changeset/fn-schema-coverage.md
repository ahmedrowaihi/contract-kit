---
"@ahmedrowaihi/fn-schema-core": minor
"@ahmedrowaihi/fn-schema-typescript": minor
---

Coverage pass: TS types that don't trip JSON Schema natively (Date, URL, RegExp, File, Blob, Buffer, Uint8Array, ArrayBuffer, bigint, branded aliases) now emit canonical schemas via a sentinel-and-rewrite pipeline. Adds `extract({ schema: { typeMappers } })` to override or extend mappings, plus `TYPE_MAPPED` / `LOSSY_MAPPING` / `NOT_REPRESENTABLE` diagnostics so every mapping decision is visible. Branded types (`type X = string & { __brand: "X" }`) keep their identity through the brand name and lose the phantom property.
