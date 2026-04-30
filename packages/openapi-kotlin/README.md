# @ahmedrowaihi/openapi-kotlin

Generate idiomatic Android / JVM Kotlin client SDKs from an OpenAPI 3.x spec — `@Serializable` data classes, `String`-raw enums, per-tag interfaces with `suspend` functions, and an OkHttp + kotlinx-serialization impl class. Per-call `RequestOptions`, composable interceptors, typed `APIError`, multipart + form-urlencoded wire encoding, multi-2xx sum-type returns, and per-op security auto-wiring all included.

Built on the [`@hey-api`](https://github.com/hey-api/openapi-ts) toolchain (`@hey-api/json-schema-ref-parser` for spec loading, `@hey-api/shared` IR for normalization). 2.0 / 3.0 / 3.1 inputs all produce the same output.

Sibling package to [`@ahmedrowaihi/openapi-swift`](../openapi-swift). Part of [contract-kit](https://github.com/ahmedrowaihi/contract-kit). Companion to the [`petstore-sdk` example](../../examples/petstore-sdk).

## Install

```bash
pnpm add @ahmedrowaihi/openapi-kotlin @ahmedrowaihi/openapi-tools @hey-api/shared @hey-api/spec-types
```

## Usage

```ts
import { generate } from "@ahmedrowaihi/openapi-kotlin";

await generate({
  input: "https://api.example.com/openapi.json",
  output: "./sdk-kotlin",
  packageName: "com.example.petstore",
});
```

Reads any of: a filesystem path, an http(s) URL, or a pre-parsed object. YAML and JSON are both supported. External `$ref`s are bundled inline.

## Output

### Schemas → `@Serializable` data classes / enums / typealiases

```kotlin
@Serializable
public data class Pet(
    public val id: Long? = null,
    public val name: String,
    public val category: Category? = null,
    public val photoUrls: List<String>,
    public val tags: List<Tag>? = null,
    public val status: Pet_Status? = null,
)

@Serializable
public enum class Pet_Status(public val raw: String) {
    @SerialName("available") AVAILABLE("available"),
    @SerialName("pending") PENDING("pending"),
    @SerialName("sold") SOLD("sold"),
}
```

Inline enums on a property get promoted to a top-level `Owner_Property` enum class. Renamed JSON keys (snake_case → camelCase) get a `@SerialName` so the wire format stays untouched.

### Operations → interfaces + impls

For each tag the generator emits:

- `interface <Tag>Api` with `suspend fun` requirements
- top-level `<Tag>Api.<op>(…)` extension funs as no-options convenience overloads (forward to the with-options form using `RequestOptions()` defaults)
- `class OkHttp<Tag>Api(client: APIClient) : <Tag>Api` with the wire impl

```kotlin
public interface PetApi {
    /** GET /pet/{petId} */
    public suspend fun getPetById(petId: Long, options: RequestOptions): Pet
    public suspend fun getPetByIdWithResponse(petId: Long, options: RequestOptions): Pair<Pet, Response>
    // …
}

public suspend fun PetApi.getPetById(petId: Long): Pet =
    getPetById(petId = petId, options = RequestOptions())

public class OkHttpPetApi(public val client: APIClient) : PetApi {
    public override suspend fun getPetById(petId: Long, options: RequestOptions): Pet { /* … */ }
    // …
}
```

Every operation also emits a sibling `*WithResponse` overload that returns `Pair<T, Response>` — for callers that need response headers (pagination cursors, `ETag`, rate limits). Void-returning operations get `*WithResponse(): Response` instead.

### Per-call control via `RequestOptions`

```kotlin
public data class RequestOptions(
    public val client: APIClient? = null,
    public val baseUrl: HttpUrl? = null,
    public val timeout: Long? = null,                                    // milliseconds
    public val headers: Map<String, String> = emptyMap(),
    public val requestInterceptors: List<suspend (Request) -> Request> = emptyList(),
    public val responseValidator: (suspend (ByteArray, Response) -> Unit)? = null,
    public val responseTransformer: (suspend (ByteArray) -> ByteArray)? = null,
)
```

```kotlin
pets.getPetById(1)                                                       // defaults
pets.getPetById(1, RequestOptions(client = customClient))                // swap transport
pets.getPetById(1, RequestOptions(headers = mapOf("X-Trace" to id)))     // extra headers
pets.getPetById(1, RequestOptions(baseUrl = stagingUrl))                 // hit staging
pets.getPetById(1, RequestOptions(timeout = 60_000))                     // long-poll override
```

### Composable interceptors + auth

The runtime `APIClient` carries an `interceptors.request` list that runs against every outgoing request. Interceptors compose — auth, logging, tracing all coexist:

```kotlin
val client = APIClient(baseUrl = "https://api.example.com/".toHttpUrl())
client.interceptors.request += { request ->
    request.newBuilder()
        .header("Authorization", "Bearer ${TokenStore.access()}")
        .build()
}
```

When the spec declares any `securitySchemes`, the generator additionally emits an `Auth` sealed class (with `Bearer`, `ApiKey`, `Basic` subclasses — `ApiKey` carries an `APIKeyLocation` of `HEADER` / `QUERY` / `COOKIE`) and the client gains a `var auth: MutableMap<String, Auth>` keyed by scheme name. Operations with `security:` requirements walk the map and apply the matching scheme automatically:

```kotlin
client.auth["bearerAuth"] = Auth.Bearer(token)
client.auth["xApiKey"] = Auth.ApiKey("X-API-Key", key, APIKeyLocation.HEADER)
```

### Body media-type dispatch

| Input media type | Generated parameter shape | Wire encoding |
|---|---|---|
| `application/json` (and `+json`) | `body: T` | `Json.encodeToString(<ser>, body).toRequestBody("application/json".toMediaType())` |
| `multipart/form-data` (object schema) | one param per property; binary fields → `ByteArray` | emitted `MultipartFormBody` helper (wraps `MultipartBody.Builder`) |
| `application/x-www-form-urlencoded` (object schema) | one param per property | `FormBody.Builder()` |
| `application/octet-stream`, image, etc. | `body: ByteArray` | raw bytes via `toRequestBody("<mt>".toMediaType())` |
| `oneOf` / unresolvable JSON | `body: ByteArray` | raw bytes (caller pre-encodes) |

### Typed errors

Every non-2xx response funnels into `APIError`:

```kotlin
public sealed class APIError(message: String? = null, cause: Throwable? = null) :
    RuntimeException(message, cause) {
    public class ClientError(public val statusCode: Int, public val body: ByteArray) : APIError(/* … */)   // 4XX
    public class ServerError(public val statusCode: Int, public val body: ByteArray) : APIError(/* … */)   // 5XX
    public class UnexpectedStatus(public val statusCode: Int, public val body: ByteArray) : APIError(/* … */) // 1XX/3XX/etc.
    public class DecodingFailed(cause: Throwable) : APIError(/* … */)                                       // kotlinx-serialization threw
    public class Transport(cause: Throwable) : APIError(/* … */)                                            // OkHttp/network layer
}
```

### Multi-2xx → sum-type return

When an operation declares more than one 2xx response code with distinct schemas, the generator emits a sealed-class hierarchy and the impl dispatches on `response.code`:

```kotlin
public sealed class SubmitJob_Response {
    public data class Status200(public val value: JobResult) : SubmitJob_Response()
    public data class Status202(public val value: Pending) : SubmitJob_Response()
    public object Status204 : SubmitJob_Response()
}
```

## Generator options

Every option is optional. Pass them to `generate({ ... })`:

| Option | Purpose |
|---|---|
| `input` / `output` | Spec source (path / URL / object) and SDK output dir. |
| `packageName` | Kotlin package every file declares. Default `"com.example.api"`. |
| `clean` | Wipe `output` before writing. Default `true`. Refuses to wipe cwd or filesystem root. |
| `gradle` | Emit `build.gradle.kts` + `settings.gradle.kts` for standalone-module mode. `true` → defaults. Object → custom `group`, `version`, plugin/dependency versions, JVM target. Omit → mode 1 (raw kotlin source tree only). |
| `defaultTag` | Tag to use when an op has none. Default `"Default"`. |
| `interfaceName` | `(tag) => string`. Default `(tag) => `${PascalCase(tag)}Api``. |
| `clientClassName` | `(interfaceName) => string`. Default `(p) => `OkHttp${p}``. |
| `interfaceOnly` | Skip impl class emission. Default `false`. |
| `openImpl` | Emit impl class as `open` so consumers can subclass. Default `false`. |
| `layout` | `"split"` (default — `api/` + `models/` sub-packages) or `"flat"` (one package). |
| `fileLocation` | `(decl) => { dir }` — full per-decl override. Rejects `..` traversal and absolute paths. |

```ts
generate({
    input,
    output,
    packageName: "com.example.petstore",
    gradle: { group: "com.example", version: "1.0.0" },
    openImpl: true,
});
```

## Two consumption modes

| Mode | Setup | When |
|---|---|---|
| **Drop into an existing Gradle module** | Paste the package directory (e.g. `com/example/petstore/`) into your module's `src/main/kotlin/` tree. The surrounding module must apply `kotlin("plugin.serialization")` and depend on OkHttp + kotlinx-serialization-json + kotlinx-coroutines-core + kotlinx-datetime. | Adding the SDK directly to one app or library. |
| **Standalone Gradle module** | Pass `gradle: true` (or an options object) to `generate()`; `build.gradle.kts` + `settings.gradle.kts` are emitted alongside the source. Run `gradle build` from the output dir. | Sharing across multiple modules, publishing privately, or wanting a clean dependency boundary. |

## Output layout

```text
sdk-kotlin/
├── com/example/petstore/
│   ├── api/
│   │   ├── PetApi.kt                  # interface
│   │   ├── PetApiExtensions.kt        # convenience overloads (no-options)
│   │   ├── OkHttpPetApi.kt            # impl class
│   │   ├── APIClient.kt               # runtime helper (transport, dispatch, decode)
│   │   ├── APIInterceptors.kt         # interceptor pipeline
│   │   ├── APIError.kt                # typed errors
│   │   ├── Auth.kt                    # (when spec has securitySchemes)
│   │   ├── APIKeyLocation.kt          # (when spec has securitySchemes)
│   │   ├── MultipartFormBody.kt       # (when any op uses multipart/form-data)
│   │   ├── URLEncoding.kt             # query helpers
│   │   ├── QueryStyle.kt              # form / spaceDelimited / pipeDelimited
│   │   └── RequestOptions.kt
│   └── models/
│       ├── Pet.kt                     # @Serializable data classes
│       ├── Pet_Status.kt              # enum classes
│       └── …
└── (build.gradle.kts + settings.gradle.kts when `gradle:` is set)
```

## Requirements

The generated code uses Kotlin coroutines + kotlinx-serialization, so:

- **Kotlin** 2.0 or newer (with `kotlin("plugin.serialization")` applied)
- **JVM target** 17 or newer (configurable via the `gradle` option)

Runtime dependencies (set up by the `gradle:` option, or by the consuming module in drop-in mode):

- `org.jetbrains.kotlinx:kotlinx-serialization-json:1.7+`
- `org.jetbrains.kotlinx:kotlinx-coroutines-core:1.9+`
- `org.jetbrains.kotlinx:kotlinx-datetime:0.6+` (only if any model uses `Instant` / `LocalDate`)
- `com.squareup.okhttp3:okhttp:4.12+`

## API surface

| Export | Purpose |
|---|---|
| `generate(opts)` | High-level entry: load → IR → decls → files on disk. |
| `schemasToDecls(schemas)` | `IR.Model.components.schemas` → `KtDecl[]`. |
| `operationsToDecls(paths, opts?)` | `IR.PathsObject` → `{ decls, needsAuth, needsMultipart }` (interfaces + impls grouped by tag). |
| `buildKotlinProject(decls, opts?)` | `KtDecl[]` → `{ path, content }[]` with package / import resolution. |
| `buildRuntimeFiles(opts, pkg)` | Standalone runtime helper files (APIClient, APIError, …) keyed off the consumer's package. |
| `buildGradleFile(opts?)` | Build a `build.gradle.kts` for a standalone Gradle module wrapping the SDK. |
| `securityKey(path, method)` | Key into `OperationsOptions.securitySchemeNames`. |
| `printFile(file)` / `kt*` builders | Lower-level Kotlin AST + printer. |

```text
src/kt-dsl/                   Kotlin AST: type/, expr/, stmt/, decl/, fun.ts, file.ts
src/kt-compiler/              AST → string, mirrors the AST tree
src/ir/
├── type/                     IR.SchemaObject → KtType
├── operation/                IR.OperationObject → signature shared by interface + impl
├── impl/                     OkHttp body builders (url, request, headers, body, decode)
├── runtime/                  Templated Kotlin source for runtime helpers
├── schema.ts                 schemasToDecls
└── operations.ts             paths → interfaces + impl classes (orchestrator)
```

Adding a new statement / expression node: add to `kt-dsl/{expr,stmt}/types.ts`, builder, one printer case. Per-method bodies are AST-built; runtime helpers (the same Kotlin every time) ship as templated strings in `ir/runtime/templates.ts`.
