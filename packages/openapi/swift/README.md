# @ahmedrowaihi/openapi-swift

Generate idiomatic iOS Swift client SDKs from an OpenAPI 3.x spec — `Codable` structs, `String`-raw enums, per-tag protocols with `async throws` requirements, and a default `URLSession`-backed impl class. Per-call `RequestOptions`, composable interceptors, typed `APIError`, multipart + form-urlencoded wire encoding, multi-2xx sum-type returns, and per-op security auto-wiring all included.

Built on the [`@hey-api`](https://github.com/hey-api/openapi-ts) toolchain (`@hey-api/json-schema-ref-parser` for spec loading, `@hey-api/shared` IR for normalization). 2.0 / 3.0 / 3.1 inputs all produce the same output.

Sibling package to [`@ahmedrowaihi/openapi-kotlin`](../openapi-kotlin). Part of [contract-kit](https://github.com/ahmedrowaihi/contract-kit). Companion to the [`petstore-sdk` example](../../examples/petstore-sdk).

## Install

```bash
pnpm add @ahmedrowaihi/openapi-swift @ahmedrowaihi/openapi-tools @hey-api/shared @hey-api/spec-types
```

## Usage

```ts
import { generate } from "@ahmedrowaihi/openapi-swift";

await generate({
  input: "https://api.example.com/openapi.json",
  output: "./sdk-swift",
});
```

Reads any of: a filesystem path, an http(s) URL, or a pre-parsed object. YAML and JSON are both supported. External `$ref`s are bundled inline.

## Output

### Schemas → `Codable` structs / enums / typealiases

```swift
public struct Pet: Codable {
    public let id: Int64?
    public let name: String
    public let category: Category?
    public let photoUrls: [String]
    public let tags: [Tag]?
    public let status: Pet_Status?

    public init(
        id: Int64? = nil,
        name: String,
        category: Category? = nil,
        photoUrls: [String],
        tags: [Tag]? = nil,
        status: Pet_Status? = nil
    ) { /* … */ }
}

public enum Pet_Status: String, Codable {
    case available = "available"
    case pending = "pending"
    case sold = "sold"
}
```

Every public struct ships an explicit `public init` so consumers from another module (mode-2 SwiftPM library) can construct values for tests and mocks — Swift's synthesized memberwise init is internal-only.

### Operations → protocols + impls

For each tag the generator emits:

- `protocol <Tag>API` with `async throws` requirements
- `extension <Tag>API` with no-options convenience overloads (forward to the with-options form using `RequestOptions()` defaults)
- `final class URLSession<Tag>API: <Tag>API` with the wire impl, holding a single `client: APIClient`

```swift
public protocol PetAPI {
    /// GET /pet/{petId}
    func getPetById(petId: Int64, options: RequestOptions) async throws -> Pet
    func getPetByIdWithResponse(petId: Int64, options: RequestOptions) async throws -> (Pet, HTTPURLResponse)
    // …
}

public extension PetAPI {
    func getPetById(petId: Int64) async throws -> Pet {
        try await getPetById(petId: petId, options: RequestOptions())
    }
    func getPetByIdWithResponse(petId: Int64) async throws -> (Pet, HTTPURLResponse) {
        try await getPetByIdWithResponse(petId: petId, options: RequestOptions())
    }
}

public final class URLSessionPetAPI: PetAPI {
    let client: APIClient
    public init(client: APIClient) { self.client = client }
    // …
}
```

Every operation also emits a sibling `*WithResponse` overload that returns `(T, HTTPURLResponse)` — for callers that need response headers (pagination cursors, `ETag`, rate limits). Void-returning operations get `*WithResponse() -> HTTPURLResponse` instead.

### Per-call control via `RequestOptions`

```swift
public struct RequestOptions {
    public var client: APIClient? = nil
    public var baseURL: URL? = nil
    public var timeout: TimeInterval? = nil
    public var headers: [String: String] = [:]
    public var requestInterceptors: [(URLRequest) async throws -> URLRequest] = []
    public var responseValidator: ((Data, HTTPURLResponse) async throws -> Void)? = nil
    public var responseTransformer: ((Data) async throws -> Data)? = nil
    public init(/* … all defaulted … */) { /* … */ }
}
```

```swift
try await pets.getPetById(petId: 1)                                              // defaults
try await pets.getPetById(petId: 1, options: .init(client: customClient))        // swap transport
try await pets.getPetById(petId: 1, options: .init(headers: ["X-Trace": id]))    // extra headers
try await pets.getPetById(petId: 1, options: .init(baseURL: stagingURL))         // hit staging
try await pets.getPetById(petId: 1, options: .init(timeout: 60))                 // long-poll override
```

### Composable interceptors + auth

The runtime `APIClient` carries an `interceptors.request` array that runs against every outgoing request. Interceptors compose — auth, logging, tracing all coexist:

```swift
let client = APIClient(baseURL: URL(string: "https://api.example.com/")!)
client.interceptors.request.append { request in
    var request = request
    request.setValue("Bearer \(await TokenStore.access())", forHTTPHeaderField: "Authorization")
    return request
}
```

When the spec declares any `securitySchemes`, the generator additionally emits an `Auth` enum (with `bearer`, `apiKey`, `basic` cases — `apiKey` carries an `APIKeyLocation` of `header` / `query` / `cookie`) and the client gains a `var auth: [String: Auth]` bag keyed by scheme name. Operations with `security:` requirements walk the bag and apply the matching scheme automatically:

```swift
client.auth["bearerAuth"] = .bearer(token: token)
client.auth["xApiKey"] = .apiKey(name: "X-API-Key", value: key, in: .header)
```

### Body media-type dispatch

| Input media type | Generated parameter shape | Wire encoding |
|---|---|---|
| `application/json` (and `+json`) | `body: T` | `JSONEncoder.encode` |
| `multipart/form-data` (object schema) | one param per property; binary fields → `Data` | emitted `MultipartFormBody` helper |
| `application/x-www-form-urlencoded` (object schema) | one param per property | `URLComponents.percentEncodedQuery` |
| `application/octet-stream`, image, etc. | `body: Data` | raw bytes |
| `oneOf` / unresolvable JSON | `body: Data` | raw bytes (caller pre-encodes) |

### Typed errors

Every non-2xx response funnels into `APIError`:

```swift
public enum APIError: Error {
    case clientError(statusCode: Int, body: Data)        // 4XX
    case serverError(statusCode: Int, body: Data)        // 5XX
    case unexpectedStatus(statusCode: Int, body: Data)   // 1XX/3XX/etc.
    case decodingFailed(Error)                           // JSONDecoder threw on a 2XX body
    case transport(Error)                                // URLSession / network layer
}
```

### Multi-2xx → sum-type return

When an operation declares more than one 2xx response code with distinct schemas, the generator emits a sum-type enum and the impl dispatches on `httpResponse.statusCode`:

```swift
public enum SubmitJob_Response {
    case status200(JobResult)
    case status202(Pending)
    case status204
}
```

## Generator options

Every option is optional. Pass them to `generate({ ... })`:

| Option | Purpose |
|---|---|
| `input` / `output` | Spec source (path / URL / object) and SDK output dir. |
| `clean` | Wipe `output` before writing. Default `true`. Refuses to wipe cwd or filesystem root. |
| `package` | Emit `Package.swift` for SwiftPM-library mode. `true` → defaults from output dir basename. Object → custom `name`, `platforms`, `toolsVersion`, `sources`. Omit → mode 1 (raw `API/` + `Models/` files only). |
| `defaultTag` | Tag to use when an op has none. Default `"Default"`. |
| `protocolName` | `(tag) => string`. Default `(tag) => `${PascalCase(tag)}API``. |
| `clientClassName` | `(protocolName) => string`. Default `(p) => `URLSession${p}``. |
| `protocolOnly` | Skip impl class emission. Default `false`. |
| `openImpl` | Emit impl class as `open` instead of `final` so consumers can subclass. Default `false`. |
| `layout` | `"split"` (default — `API/` + `Models/`) or `"flat"`. |
| `fileLocation` | `(decl) => { dir }` — full per-decl override. Rejects `..` traversal and absolute paths. |

```ts
generate({
    input,
    output,
    package: { name: "PetstoreSDK" },
    openImpl: true,
    layout: "flat",
});
```

## Two consumption modes

| Mode | Setup | When |
|---|---|---|
| **Drop into an Xcode target** | Paste `API/` + `Models/` into your app's target sources. Same module, no `import` needed. | Adding the SDK directly to one app. |
| **Standalone SwiftPM library** | Pass `package: { name: "YourSDK" }` to `generate()`; `Package.swift` is emitted alongside the source. Consumers reach for it via `.package(path: …)` or a git URL and `import YourSDK`. | Sharing across multiple apps, publishing privately, or wanting a clean module boundary. |

## Output layout

```text
sdk-swift/
├── API/
│   ├── PetAPI.swift                # protocol
│   ├── PetAPI+Defaults.swift       # convenience overloads (no-options)
│   ├── URLSessionPetAPI.swift      # impl class
│   ├── APIClient.swift             # runtime helper (transport, dispatch, decode)
│   ├── APIInterceptors.swift       # interceptor pipeline
│   ├── APIError.swift              # typed errors
│   ├── Auth.swift                  # (when spec has securitySchemes)
│   ├── APIKeyLocation.swift        # (when spec has securitySchemes)
│   ├── MultipartFormBody.swift     # (when any op uses multipart/form-data)
│   ├── URLEncoding.swift           # (when any op has query params)
│   ├── QueryStyle.swift            # (when any op has query params)
│   └── RequestOptions.swift
└── Models/
    ├── Pet.swift                   # Codable structs
    ├── Pet_Status.swift            # enums
    └── …
```

## Requirements

The generated code uses Swift Concurrency, so:

- **Swift** 5.5 or newer
- **iOS** 13.0+ (with the back-deployment library) / **iOS 15+** native, **macOS** 12+, **tvOS** 15+, **watchOS** 8+

Zero runtime dependencies — the SDK only imports `Foundation`.

## API surface

| Export | Purpose |
|---|---|
| `generate(opts)` | High-level entry: load → IR → decls → files on disk. |
| `schemasToDecls(schemas)` | `IR.Model.components.schemas` → `SwDecl[]`. |
| `operationsToDecls(paths, opts?)` | `IR.PathsObject` → `SwDecl[]` (protocols + impls grouped by tag). |
| `buildSwiftProject(decls, opts?)` | `SwDecl[]` → `{ path, content }[]` with `import Foundation` per file. |
| `packageSwiftFile(opts)` | Build a `Package.swift` for a SwiftPM-library wrapping the SDK. |
| `securityKey(path, method)` | Key into `OperationsOptions.securitySchemeNames`. |
| `printFile(file)` / `sw*` builders | Lower-level Swift AST + printer. |

```text
src/sw-dsl/                   Swift AST: types/, expr/, stmt/, decl/, fun.ts, file.ts
src/sw-compiler/              AST → string, mirrors the AST tree
src/ir/
├── type/                     IR.SchemaObject → SwType
├── operation/                IR.OperationObject → signature shared by protocol + impl
├── impl/                     URLSession body builders (url, request, headers, body, decode)
├── runtime/                  Top-level helper decls (APIClient, APIError, RequestOptions, Auth, …)
├── schema.ts                 schemasToDecls
└── operations.ts             paths → protocols + impl classes (orchestrator)
```

Adding a new statement / expression node: add to `sw-dsl/{expr,stmt}/types.ts`, builder, one printer case. No string templating — everything is AST-built.
