---
"@ahmedrowaihi/openapi-go": patch
"@ahmedrowaihi/openapi-swift": patch
"@ahmedrowaihi/openapi-kotlin": patch
---

Fix two gaps surfaced by real-world specs (Mux API):

- **PHP-style array param names** (`timeframe[]`): `pascal()` now strips trailing non-alphanumeric characters so identifiers like `timeframe[]` produce `Timeframe` instead of leaking the brackets into the generated source. Wire-level query keys are unaffected (the impl still emits the original `timeframe[]` for the URL).
- **Integer-valued enum schemas** (`enum: [0, 90, 180, 270]`): previously rejected with a thrown error.
  - Go: emits `type Foo int` + a typed-const block (e.g. `Rotate90 Rotate = 90`).
  - Swift: emits `enum Foo: Int, Codable { case _0 = 0; case _90 = 90 }`.
  - Kotlin: degrades to `typealias Foo = Int` — kotlinx-serialization's enum support only round-trips string raw values via `@SerialName`; the typealias preserves the wire type without forcing a custom `KSerializer`.
  - Mixed string + integer enums throw with a clear "must all be strings or all integers" message.
