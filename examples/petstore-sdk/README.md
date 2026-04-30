# petstore-sdk — multi-target SDK generation demo

End-to-end demo: **one OpenAPI spec → multiple platform SDKs**, the central use case for the native-client codegen story in this repo.

The shared spec lives at [`../../fixtures/petstore.yaml`](../../fixtures/petstore.yaml) (also consumed by `examples/orpc-basic`). Each platform has its own `<lang>/` directory containing a `gen.ts` script, the generated `sdk/` tree, and an `Example.<ext>` file showing real usage.

## Targets

| Target | Status | Generator | Stack |
|---|---|---|---|
| Kotlin (Android / JVM) | ✓ | [`@ahmedrowaihi/openapi-kotlin`](../../packages/openapi-kotlin) | OkHttp + kotlinx-serialization + suspend |
| Swift (iOS) | ✓ | [`@ahmedrowaihi/openapi-swift`](../../packages/openapi-swift) | URLSession + `Codable` + async throws |

## Run

```bash
# from repo root
pnpm install
pnpm --filter @ahmedrowaihi/openapi-kotlin build
pnpm --filter @ahmedrowaihi/openapi-swift build
pnpm --filter @ahmedrowaihi/example-petstore-sdk gen        # all targets
# or one at a time:
pnpm --filter @ahmedrowaihi/example-petstore-sdk gen:kotlin
pnpm --filter @ahmedrowaihi/example-petstore-sdk gen:swift
```

Each `<lang>/sdk/` directory is committed so PRs can review codegen diffs whenever a generator changes.

## Layout

One subdir per target language. Each follows the same shape:

```
examples/petstore-sdk/
├── kotlin/
│   ├── gen.ts                              ← reads fixtures/petstore.yaml → emits sdk/
│   ├── Example.kt                          ← real usage: CRUD, auth, headers, validators…
│   └── sdk/com/example/petstore/
│       ├── api/
│       │   ├── PetApi.kt                   ← interface, suspend funs + *WithResponse
│       │   ├── OkHttpPetApi.kt             ← impl class
│       │   ├── PetApiExtensions.kt         ← no-options convenience overloads
│       │   ├── APIClient.kt                ← runtime helper (transport, dispatch, decode)
│       │   ├── APIError.kt                 ← typed errors
│       │   ├── Auth.kt                     ← Bearer / ApiKey / Basic
│       │   ├── MultipartFormBody.kt
│       │   ├── URLEncoding.kt
│       │   └── RequestOptions.kt
│       └── models/
│           ├── Pet.kt                      ← @Serializable data class
│           └── …
└── swift/
    ├── gen.ts                              ← reads fixtures/petstore.yaml → emits sdk/
    ├── Example.swift                       ← real usage: CRUD, auth, headers, validators…
    └── sdk/
        ├── API/
        │   ├── PetAPI.swift                ← protocol, async-throws + *WithResponse
        │   ├── URLSessionPetAPI.swift      ← impl class
        │   ├── APIClient.swift             ← runtime helper
        │   ├── APIError.swift
        │   ├── Auth.swift
        │   └── …
        └── Models/
            ├── Pet.swift                   ← Codable struct
            └── …
```

Adding a new language is a copy of the pattern: `<lang>/gen.ts` writes into `<lang>/sdk/`.

## Usage examples

The `Example.kt` and `Example.swift` files are both compilable end-to-end and cover the same scenarios:

- CRUD against `https://petstore3.swagger.io/api/v3/`
- Bearer / API-key auth via `client.auth["<scheme>"]`
- Multipart upload (binary + text fields)
- Typed-error pattern matching (`APIError.ClientError(404)`)
- Per-call `RequestOptions`: dynamic `baseUrl` for staging, custom headers, per-call timeout, swap clients
- `*WithResponse` overloads for response-header access
- `responseTransformer` to unwrap a server envelope before decoding
- `responseValidator` for runtime checks (empty body, content-type)
- Composable request interceptors (`client.interceptors.request +=`)

See [`kotlin/Example.kt`](./kotlin/Example.kt) and [`swift/Example.swift`](./swift/Example.swift) for the actual code.

## Customizing

Each `<lang>/gen.ts` is a thin wrapper over `generate(...)`. To customize Kotlin output (package name, layout, file placement), edit [`kotlin/gen.ts`](./kotlin/gen.ts):

```ts
await generate({
    input: "fixtures/petstore.yaml",
    output: "kotlin/sdk",
    packageName: "com.example.petstore",
    layout: "split",                   // or "flat"
    // gradle: { group: "com.example", version: "1.0.0" },  // standalone Gradle module
    // openImpl: true,                 // emit impl class as `open`
});
```

Swift output ([`swift/gen.ts`](./swift/gen.ts)) accepts a similar shape — `layout`, `openImpl`, plus `package: { name }` to emit a standalone SwiftPM library:

```ts
await generate({
    input: "fixtures/petstore.yaml",
    output: "swift/sdk",
    layout: "split",                   // or "flat"
    // package: { name: "PetstoreSDK" },   // standalone SwiftPM library
    // openImpl: true,
});
```

See each generator's package README for the full options table:

- [`@ahmedrowaihi/openapi-kotlin`](../../packages/openapi-kotlin/README.md)
- [`@ahmedrowaihi/openapi-swift`](../../packages/openapi-swift/README.md)
