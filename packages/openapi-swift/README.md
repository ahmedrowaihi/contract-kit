# @ahmedrowaihi/openapi-swift

Generate idiomatic iOS Swift client SDKs from an OpenAPI 3.x spec — `Codable` structs + `String`-raw enums + protocol contracts with `async throws` functions, ready to drop into an Xcode project or Swift Package.

Built on the [`@hey-api`](https://github.com/hey-api/openapi-ts) toolchain (`@hey-api/json-schema-ref-parser` for spec loading, `@hey-api/shared` IR for normalization). 2.0 / 3.0 / 3.1 inputs all produce the same output.

Sibling package to [`@ahmedrowaihi/openapi-kotlin`](../openapi-kotlin) — same architecture, same milestones, Swift-native output. Part of [contract-kit](https://github.com/ahmedrowaihi/contract-kit). Companion to the [`petstore-sdk` example](../../examples/petstore-sdk).

## Install

```bash
pnpm add @ahmedrowaihi/openapi-swift @ahmedrowaihi/openapi-tools @hey-api/shared @hey-api/spec-types
```

## Usage

```ts
import { generate } from "@ahmedrowaihi/openapi-swift";

await generate({
  input: "https://api.example.com/openapi.json",   // path / URL / pre-parsed object
  output: "./sdk-swift",
});
```

Reads any of: a filesystem path, an http(s) URL, or a pre-parsed object. YAML and JSON are both supported. External `$ref`s are bundled inline.

## Output

### Schemas → `Codable` structs / enums / typealiases

```swift
import Foundation

public struct Pet: Codable {
    public let id: Int64?
    public let name: String
    public let category: Category?
    public let photoUrls: [String]
    public let tags: [Tag]?
    public let status: Pet_Status?
}
```

Inline string enums become `String`-raw `Codable` enums:

```swift
public enum Pet_Status: String, Codable {
    case available = "available"
    case pending = "pending"
    case sold = "sold"
}
```

### Operations → protocols + URLSession default impls

For each tag the generator emits a `protocol <Tag>API` with `async throws` requirements **and** a `final class URLSession<Tag>API: <Tag>API` that wires up `URLSession`, `JSONEncoder`, `JSONDecoder`. Default impl handles JSON, octet-stream, path/query/header params, optional `if let` dispatch, and tuple-destructured `data` reads. Multipart and form-urlencoded bodies throw a sentinel `URLSessionAPIError.unimplementedBody(mediaType:)` you can catch and override.

```swift
public protocol PetAPI {
    /// GET /pet/{petId}
    func getPetById(
        petId: Int64
    ) async throws -> Pet

    /// POST /pet
    func addPet(
        body: Pet
    ) async throws -> Pet

    /// DELETE /pet/{petId}
    func deletePet(
        petId: Int64,
        apiKey: String? = nil
    ) async throws
}

public final class URLSessionPetAPI: PetAPI {
    let baseURL: URL
    let session: URLSession
    let decoder: JSONDecoder
    let encoder: JSONEncoder

    public init(
        baseURL: URL,
        session: URLSession = .shared,
        decoder: JSONDecoder = JSONDecoder(),
        encoder: JSONEncoder = JSONEncoder()
    ) { /* … */ }

    public func getPetById(petId: Int64) async throws -> Pet {
        let url = baseURL.appendingPathComponent("pet/\(petId)")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        let (data, _) = try await session.data(for: request)
        return try decoder.decode(Pet.self, from: data)
    }
    // … one impl per protocol method …
}
```

The protocol-only output (no impl class) is opt-in:

```ts
generate({ ..., protocolOnly: true });
```

### Per-request control

Every generated impl class exposes a public `var requestDecorator` you can swap in after construction. It runs once between body wiring and the `URLSession.data(for:)` call — the right place for dynamic auth headers, request signing, conditional retries, or per-call logging, without having to reimplement the protocol.

```swift
let api = URLSessionPetAPI(baseURL: baseURL)
api.requestDecorator = { request in
    var request = request
    let token = try await tokenStore.fresh()
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    return request
}
let pet = try await api.getPetById(petId: 1)
```

For session-level concerns (static auth header, custom timeout, retries), pass a configured `URLSession` to `init` — the impl uses whatever session you provide.

### Subclassable impl

To override individual methods rather than wrap or compose, emit the class as `open` instead of `final`:

```ts
generate({ ..., openImpl: true });
// → public open class URLSessionPetAPI: PetAPI { … }
```

Required-first parameter ordering. Optional params get `? = nil` defaults. Empty 2xx responses (204, 200 with no schema) emit `async throws` with no return type (Swift `Void`).

### Body media-type dispatch

| Input media type | Generated parameter shape |
|---|---|
| `application/json` (and `+json`) | `body: T` |
| `multipart/form-data` (object schema) | one param per property; binary fields → `Data` |
| `application/x-www-form-urlencoded` (object schema) | one param per property |
| `application/octet-stream`, image, etc. | `body: Data` |

The protocol carries the typed shape; consumers (or a generated default impl) handle the wire encoding.

## Output layout

```
sdk-swift/
├── API/
│   └── PetAPI.swift        # protocols
└── Models/
    ├── Pet.swift           # Codable structs
    ├── Pet_Status.swift    # enums
    └── …
```

`flat` layout puts everything at the root. Pass `fileLocation` to fully customize:

```ts
generate({
    ...,
    layout: "flat",
    // OR full per-decl override:
    fileLocation: (decl) => ({ dir: `Sources/MyAPI/${decl.kind === "protocol" ? "API" : "Models"}` }),
});
```

## Requirements

The generated code uses [`async`/`await`](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/), so:

- **Swift** 5.5 or newer
- **iOS** 13.0+ (with the Swift concurrency back-deployment library) / **iOS 15+** native, **macOS** 12+, **tvOS** 15+, **watchOS** 8+

Zero runtime dependencies — the SDK only imports `Foundation`.

## Adding the SDK to an Xcode project

Pick whichever fits your project layout:

### Swift Package Manager (recommended)

Wrap the generated `sdk-swift/` directory in a `Package.swift`:

```swift
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "PetstoreAPI",
    platforms: [.iOS(.v15), .macOS(.v12)],
    products: [
        .library(name: "PetstoreAPI", targets: ["PetstoreAPI"]),
    ],
    targets: [
        .target(
            name: "PetstoreAPI",
            path: "sdk-swift"   // points at the generated tree
        ),
    ]
)
```

Then add the package to your app via **Xcode → File → Add Package Dependencies… → Add Local…** or in your app's own `Package.swift`:

```swift
.package(path: "../petstore-sdk")
```

### Drag & drop into Xcode

Drag the `sdk-swift/` folder into your Xcode project's source list, choose **Create groups**, and tick the target you want it added to. No package manifest needed.

### CocoaPods

Wrap the directory in a `.podspec` if you publish through CocoaPods — the generated SDK has zero runtime deps so the spec stays minimal.

## Consuming the output

You can use the generated `URLSession<Tag>API` class directly:

```swift
let api = URLSessionPetAPI(baseURL: URL(string: "https://petstore3.swagger.io/api/v3/")!)
let pet = try await api.getPetById(petId: 1)
```

…or implement the protocol yourself for auth, retries, custom decoders, or to plug in a different HTTP client:

```swift
import Foundation

public final class URLSessionPetAPI: PetAPI {
    let baseURL: URL
    let session: URLSession
    let decoder = JSONDecoder()
    let encoder = JSONEncoder()

    public init(baseURL: URL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    public func getPetById(petId: Int64) async throws -> Pet {
        let url = baseURL.appendingPathComponent("pet/\(petId)")
        let (data, _) = try await session.data(from: url)
        return try decoder.decode(Pet.self, from: data)
    }

    public func addPet(body: Pet) async throws -> Pet {
        var req = URLRequest(url: baseURL.appendingPathComponent("pet"))
        req.httpMethod = "POST"
        req.httpBody = try encoder.encode(body)
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let (data, _) = try await session.data(for: req)
        return try decoder.decode(Pet.self, from: data)
    }
    // …
}
```

This pattern keeps the generated code free of opinions about auth, retries, logging, error model — your app owns those. See the [petstore-sdk example README](../../examples/petstore-sdk/README.md) for fuller setup notes.

## API

| Export | Purpose |
| --- | --- |
| `generate(opts)` | High-level entry: load → IR → decls → files on disk. |
| `schemasToDecls(schemas)` | `IR.Model.components.schemas` → `SwDecl[]`. |
| `operationsToDecls(paths, opts?)` | `IR.PathsObject` → `SwDecl[]` (protocols grouped by tag). |
| `buildSwiftProject(decls, opts?)` | `SwDecl[]` → `{ path, content }[]` with `import Foundation` per file. |
| `printFile(file)` / `sw*` builders | Lower-level Swift AST + printer. |

Internals are organized so each concern lives in one file:

```
src/sw-dsl/                Swift AST: types/, expr/, stmt/, decl/, fun.ts, file.ts
src/sw-compiler/           AST → string, mirrors AST tree
src/ir/
├── type/                  IR.SchemaObject → SwType (primitive, object, enum, union)
├── operation/             IR.OperationObject → signature (params, return, doc) shared by protocol + impl
├── impl/                  URLSession-based body builders (url, request, headers, body, decode)
├── schema.ts              schemasToDecls
├── operations.ts          paths → protocols + impl classes (orchestrator)
└── …
```

Adding a new statement / expression node: add to `sw-dsl/{expr,stmt}/types.ts` + builder + one printer case. No string templating anywhere — `body.ts`, `url.ts`, `headers.ts` etc. all build statements via the AST builders.
