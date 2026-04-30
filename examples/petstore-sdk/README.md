# petstore-sdk — multi-target SDK generation demo

End-to-end demo: **one OpenAPI spec → multiple platform SDKs**, with each language's example wired up as a real consumer project that depends on the generated SDK like an adopter would.

The shared spec lives at [`../../fixtures/petstore.yaml`](../../fixtures/petstore.yaml) (also consumed by `examples/orpc-basic`). Each platform has its own `<lang>/` directory containing a `gen.ts` script that writes the SDK into `sdk/`, plus a sibling `example/` consumer module.

## Targets

| Target | Status | Generator | Stack |
|---|---|---|---|
| Kotlin (Android / JVM) | ✓ | [`@ahmedrowaihi/openapi-kotlin`](../../packages/openapi-kotlin) | OkHttp + kotlinx-serialization + suspend |
| Swift (iOS / macOS) | ✓ | [`@ahmedrowaihi/openapi-swift`](../../packages/openapi-swift) | URLSession + `Codable` + async throws |
| Go | ✓ | [`@ahmedrowaihi/openapi-go`](../../packages/openapi-go) | net/http + encoding/json + context.Context |

## Run

Generate the SDKs:

```bash
# from repo root
pnpm install
pnpm --filter @ahmedrowaihi/openapi-kotlin build
pnpm --filter @ahmedrowaihi/openapi-swift build
pnpm --filter @ahmedrowaihi/openapi-go build
pnpm --filter @ahmedrowaihi/example-petstore-sdk gen        # all targets
# or one at a time:
pnpm --filter @ahmedrowaihi/example-petstore-sdk gen:kotlin
pnpm --filter @ahmedrowaihi/example-petstore-sdk gen:swift
pnpm --filter @ahmedrowaihi/example-petstore-sdk gen:go
```

Build / run each example consumer:

```bash
# Go — standalone module that depends on ../sdk via `replace`
cd go/example && go run .

# Swift — SwiftPM executable that depends on ../sdk via .package(path: …)
cd swift/example && swift run PetstoreApp

# Kotlin — Gradle multi-module (root settings.gradle.kts → :sdk + :example)
cd kotlin && gradle :example:run
```

Each `<lang>/sdk/` directory is committed so PRs can review codegen diffs whenever a generator changes.

## Layout

Each language target follows the same shape: a generated `sdk/` source tree plus a sibling `example/` consumer that depends on it through whatever the language's package manager calls a path-based dependency.

```
examples/petstore-sdk/
├── kotlin/
│   ├── settings.gradle.kts                ← include(":sdk", ":example")
│   ├── build.gradle.kts                   ← root: shared repositories
│   ├── gen.ts                             ← reads fixtures/petstore.yaml → emits sdk/
│   ├── sdk/
│   │   ├── build.gradle.kts               ← :sdk module — kotlin lib + serialization plugin + deps
│   │   └── com/example/petstore/api/…     ← generated source (api/ + models/)
│   └── example/
│       ├── build.gradle.kts               ← depends on project(":sdk")
│       └── src/main/kotlin/…/Main.kt      ← consumer code, imports the SDK
├── swift/
│   ├── gen.ts
│   ├── sdk/
│   │   ├── Package.swift                  ← `library "PetstoreSDK"` (emitted by `package: {…}`)
│   │   ├── API/                           ← protocols + impls + runtime helpers
│   │   └── Models/
│   └── example/
│       ├── Package.swift                  ← `executable "PetstoreApp"` depending on ../sdk
│       └── Sources/PetstoreApp/main.swift ← consumer code, `import PetstoreSDK`
└── go/
    ├── gen.ts
    ├── sdk/
    │   ├── go.mod                         ← `module petstore` (emitted by `gomod: {…}`)
    │   └── *.go                           ← generated source (one file per type)
    └── example/
        ├── go.mod                         ← `module example`, replace petstore => ../sdk
        └── main.go                        ← consumer code, `import "petstore"`
```

The example modules are real, runnable consumer projects — same shape an adopter would use when vendoring the SDK into their own app.

## Usage examples

The example consumer in each `<lang>/example/` covers the same scenarios:

- CRUD against `https://petstore3.swagger.io/api/v3/`
- Bearer / API-key auth via `client.auth["<scheme>"]`
- Multipart upload (binary + text fields)
- Typed-error pattern matching (`APIError.ClientError` / 404 path)
- Per-call `RequestOptions`: dynamic `baseUrl` for staging, custom headers, per-call timeout, swap clients
- `*WithResponse` overloads for response-header access
- `responseTransformer` to unwrap a server envelope before decoding
- `responseValidator` for runtime checks (empty body, content-type)
- Composable request interceptors

See:

- [`kotlin/example/src/main/kotlin/com/example/petstoreapp/Main.kt`](./kotlin/example/src/main/kotlin/com/example/petstoreapp/Main.kt)
- [`swift/example/Sources/PetstoreApp/main.swift`](./swift/example/Sources/PetstoreApp/main.swift)
- [`go/example/main.go`](./go/example/main.go)

## Customizing

Each `<lang>/gen.ts` is a thin wrapper over the generator's `generate(...)`. See the per-package READMEs for the full options table:

- [`@ahmedrowaihi/openapi-kotlin`](../../packages/openapi-kotlin/README.md)
- [`@ahmedrowaihi/openapi-swift`](../../packages/openapi-swift/README.md)
- [`@ahmedrowaihi/openapi-go`](../../packages/openapi-go/README.md)
