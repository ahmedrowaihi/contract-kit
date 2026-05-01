# @ahmedrowaihi/openapi-go

Generate idiomatic Go client SDKs from an OpenAPI 3.x spec — `encoding/json` structs, typed-string enums, per-tag interfaces with `context.Context` first-arg + `*WithResponse` companions, and a `net/http`-backed impl struct. Per-call `RequestOptions`, composable interceptors, typed `APIError`, multipart + form-urlencoded wire encoding, multi-2xx sealed-style returns, and per-op security auto-wiring all included. Zero runtime dependencies — stdlib only.

Built on the [`@hey-api`](https://github.com/hey-api/openapi-ts) toolchain (`@hey-api/json-schema-ref-parser` for spec loading, `@hey-api/shared` IR for normalization). 2.0 / 3.0 / 3.1 inputs all produce the same output.

Sibling package to [`@ahmedrowaihi/openapi-kotlin`](../openapi-kotlin) and [`@ahmedrowaihi/openapi-swift`](../openapi-swift). Part of [contract-kit](https://github.com/ahmedrowaihi/contract-kit). Companion to the [`petstore-sdk` example](../../examples/petstore-sdk).

## Install

```bash
pnpm add @ahmedrowaihi/openapi-go @ahmedrowaihi/openapi-tools @hey-api/shared @hey-api/spec-types
```

## Usage

```ts
import { generate } from "@ahmedrowaihi/openapi-go";

await generate({
  input: "https://api.example.com/openapi.json",
  output: "./sdk-go",
  packageName: "petstore",
});
```

Reads any of: a filesystem path, an http(s) URL, or a pre-parsed object. YAML and JSON are both supported. External `$ref`s are bundled inline.

## Output

### Schemas → structs / typed-string enums / type aliases

```go
type Pet struct {
    Id        *int64    `json:"id,omitempty"`
    Name      string    `json:"name"`
    Category  *Category `json:"category,omitempty"`
    PhotoUrls []string  `json:"photoUrls"`
    Tags      []Tag     `json:"tags,omitempty"`
    Status    *PetStatus `json:"status,omitempty"`
}

type PetStatus string

const (
    PetStatusAvailable PetStatus = "available"
    PetStatusPending   PetStatus = "pending"
    PetStatusSold      PetStatus = "sold"
)
```

Optional fields use pointer types (`*int64`, `*Category`) + `omitempty` so JSON can distinguish absent from zero. Required fields are bare. Slices and maps are nilable in Go and get `omitempty` without pointer-wrapping.

### Operations → interfaces + impls

For each tag the generator emits:

- `type <Tag>API interface` with one method per op + a `*WithResponse` twin that returns the raw `*http.Response`
- `type NetHTTP<Tag>API struct { client *APIClient }` impl
- `func NewNetHTTP<Tag>API(client *APIClient) *NetHTTP<Tag>API` constructor

```go
type PetAPI interface {
    // GET /pet/{petId}
    GetPetById(ctx context.Context, petId int64, opts RequestOptions) (*Pet, error)
    GetPetByIdWithResponse(ctx context.Context, petId int64, opts RequestOptions) (*Pet, *http.Response, error)
    // …
}

type NetHTTPPetAPI struct {
    client *APIClient
}

func NewNetHTTPPetAPI(client *APIClient) *NetHTTPPetAPI {
    return &NetHTTPPetAPI{client: client}
}
```

Method conventions:
- **`ctx context.Context`** is the first arg — Go's idiomatic cancellation/deadline channel; replaces the `timeout` field that swift/kotlin's `RequestOptions` carries (`opts.Timeout` is still available as a convenience knob).
- **`opts RequestOptions`** is the trailing arg — same shape as kotlin/swift.
- **Named returns** (`(result *Pet, err error)`) so err-check sites do bare `return` without zero-value matching.
- **No method overloading** — `*WithResponse` is a separately named method (Go has no overloads).

### Per-call control via `RequestOptions`

```go
type RequestOptions struct {
    Client               *APIClient
    BaseURL              string
    Timeout              time.Duration
    Headers              map[string]string
    RequestInterceptors  []func(*http.Request) (*http.Request, error)
    ResponseValidator    func(body []byte, resp *http.Response) error
    ResponseTransformer  func(body []byte) ([]byte, error)
}
```

```go
pets.GetPetById(ctx, 1, RequestOptions{})                                    // defaults
pets.GetPetById(ctx, 1, RequestOptions{Client: customClient})                // swap transport
pets.GetPetById(ctx, 1, RequestOptions{Headers: map[string]string{"X-Trace": id}})
pets.GetPetById(ctx, 1, RequestOptions{BaseURL: "https://staging.example.com/api/v3"})
pets.GetPetById(ctx, 1, RequestOptions{Timeout: 60 * time.Second})
```

### Composable interceptors + auth

The runtime `APIClient` carries an `Interceptors` slice that runs against every outgoing request. Interceptors compose — auth, logging, tracing all coexist:

```go
client := NewAPIClient("https://api.example.com/")
client.Interceptors = append(client.Interceptors, func(req *http.Request) (*http.Request, error) {
    req.Header.Set("Authorization", "Bearer "+TokenStore.Access())
    return req, nil
})
```

When the spec declares any `securitySchemes`, the generator additionally emits an `Auth` interface (with `BearerAuth`, `APIKeyAuth`, `BasicAuth` concrete types — `APIKeyAuth` carries an `APIKeyLocation` of `Header` / `Query` / `Cookie`) and the client gains an `Auth map[string]Auth` keyed by scheme name. Operations with `security:` requirements walk the map and apply the matching scheme automatically:

```go
client.Auth["petstore_auth"] = BearerAuth{Token: token}
client.Auth["api_key"] = APIKeyAuth{Name: "X-API-Key", Value: key, Location: APIKeyHeader}
```

### Body media-type dispatch

| Input media type | Generated parameter | Wire encoding |
|---|---|---|
| `application/json` (and `+json`) | `body *T` | `json.Marshal(body)` |
| `multipart/form-data` (object schema) | one param per property; binary fields → `[]byte` | emitted `MultipartFormBody` helper (wraps `mime/multipart`) |
| `application/x-www-form-urlencoded` (object schema) | one param per property | `url.Values{}.Encode()` |
| `application/octet-stream`, image, etc. | `body []byte` | raw bytes |
| `oneOf` / unresolvable JSON | `body []byte` | raw bytes (caller pre-encodes) |

### Typed errors

Every non-2xx response funnels into `*APIError`:

```go
type APIError struct {
    Kind       APIErrorKind
    StatusCode int    // populated for ClientError / ServerError / Unexpected
    Body       []byte // raw response body for HTTP errors
    Cause      error  // underlying error for transport / encoding / decoding
}
```

`APIErrorKind` is an `iota`-typed enum: `APIErrorKindClient` (4xx), `APIErrorKindServer` (5xx), `APIErrorKindUnexpected`, `APIErrorKindEncoding`, `APIErrorKindDecoding`, `APIErrorKindTransport`. Pattern-match with `errors.As`:

```go
var apiErr *APIError
if errors.As(err, &apiErr) {
    switch apiErr.Kind {
    case APIErrorKindClient:  // 4xx — apiErr.StatusCode + apiErr.Body
    case APIErrorKindServer:  // 5xx
    case APIErrorKindTransport: // network / I/O — apiErr.Cause
    }
}
```

### Multi-2xx → sealed-style sum type

When an operation declares more than one 2xx response code with distinct schemas, the generator emits a marker interface + concrete types — Go's idiomatic sum-type pattern:

```go
type SubmitJobResponse interface {
    isSubmitJobResponse()
}

type SubmitJobResponseStatus200 struct{ Value JobResult }
func (SubmitJobResponseStatus200) isSubmitJobResponse() {}

type SubmitJobResponseStatus204 struct{}
func (SubmitJobResponseStatus204) isSubmitJobResponse() {}
```

Callers dispatch with a type switch:

```go
result, err := jobs.SubmitJob(ctx, body, RequestOptions{})
switch r := result.(type) {
case SubmitJobResponseStatus200:
    handle(r.Value)
case SubmitJobResponseStatus204:
    // empty 204
}
```

## Generator options

Every option is optional. Pass them to `generate({ ... })`:

| Option | Purpose |
|---|---|
| `input` / `output` | Spec source (path / URL / object) and SDK output dir. |
| `packageName` | Go package every file declares. Default `"api"`. |
| `clean` | Wipe `output` before writing. Default `true`. Refuses to wipe cwd or filesystem root. |
| `gomod` | Pass `{ module: "github.com/example/foo" }` to emit a minimal `go.mod` at the output root for standalone-module mode. Omit for drop-in mode. |
| `defaultTag` | Tag to use when an op has none. Default `"Default"`. |
| `interfaceName` | `(tag) => string`. Default `(tag) => `${PascalCase(tag)}API``. |
| `clientStructName` | `(interfaceName) => string`. Default `(p) => `NetHTTP${p}``. |
| `interfaceOnly` | Skip impl struct emission. Default `false`. |
| `fileLocation` | `(decl) => { dir, file }` — full per-decl override. Rejects `..` traversal and absolute paths. |

```ts
generate({
    input,
    output,
    packageName: "petstore",
    gomod: { module: "github.com/example/petstore-sdk" },
});
```

## Two consumption modes

| Mode | Setup | When |
|---|---|---|
| **Drop into an existing module** | Paste the `.go` files into your module's source tree under any directory; they all declare the same `package <packageName>`. No third-party deps needed. | Adding the SDK directly to one app or service. |
| **Standalone Go module** | Pass `gomod: { module: "..." }` to `generate()`; a minimal `go.mod` is emitted at the output root. Run `go build ./...` from the output dir. | Sharing across multiple modules or publishing as a separate Git repo. |

## Output layout

```text
sdk-go/
├── pet.go                          # struct
├── pet_status.go                   # type alias + const block (enum)
├── pet_api.go                      # interface
├── net_http_pet_api.go             # impl struct + constructor + all methods
├── api_client.go                   # runtime helper (transport, dispatch, decode)
├── api_error.go                    # typed errors
├── auth.go                         # (when spec has securitySchemes)
├── api_key_location.go             # (when spec has securitySchemes)
├── multipart_form_body.go          # (when any op uses multipart/form-data)
├── url_encoding.go                 # query helpers
├── query_style.go                  # form / spaceDelimited / pipeDelimited
├── request_options.go
└── (go.mod when `gomod:` is set)
```

Conventions:
- One file per type (struct / interface / typed-string enum) — Go convention.
- All methods on a receiver collapse into one file (`net_http_<tag>_api.go`).
- Snake_case file names that respect acronyms (`NetHTTPPetAPI` → `net_http_pet_api.go`).
- Sealed-style multi-2xx response types (interface + concrete cases + marker methods) collapse into a single file named after the interface.

## Requirements

- **Go** 1.22 or newer (uses generics for `Execute[T]`).
- **No third-party dependencies** — the SDK uses only stdlib (`net/http`, `encoding/json`, `mime/multipart`, `context`, …).

## API surface

| Export | Purpose |
|---|---|
| `generate(opts)` | High-level entry: load → IR → decls → files on disk. |
| `schemasToDecls(schemas)` | `IR.Model.components.schemas` → `GoDecl[]`. |
| `operationsToDecls(paths, opts?)` | `IR.PathsObject` → `{ decls, needsAuth, needsMultipart }`. |
| `buildGoProject(decls, opts?)` | `GoDecl[]` → `{ path, content }[]` with package / import resolution. |
| `buildRuntimeFiles(opts, pkg)` | Standalone runtime helper files (APIClient, APIError, …). |
| `gomodFile(opts)` | Build a minimal `go.mod` for standalone-module mode. |
| `securityKey(path, method)` | Key into `OperationsOptions.securitySchemeNames`. |
| `printFile(file)` / `go*` builders | Lower-level Go AST + printer. |

```text
src/go-dsl/                   Go AST: type/, expr/, stmt/, decl/, file.ts
src/go-compiler/              AST → string, mirrors the AST tree
src/ir/
├── type/                     IR.SchemaObject → GoType
├── operation/                IR.OperationObject → signature shared by interface + impl
├── impl/                     net/http body builders (url, request, headers, body, decode)
├── runtime/                  Templated Go source for runtime helpers
├── schema.ts                 schemasToDecls
└── operations.ts             paths → interfaces + impl structs (orchestrator)
```

Per-method bodies are AST-built; runtime helpers (the same Go every time) ship as templated strings in `ir/runtime/templates.ts`.
