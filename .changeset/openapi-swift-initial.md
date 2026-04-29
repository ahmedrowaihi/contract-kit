---
"@ahmedrowaihi/openapi-swift": minor
---

Initial release. Generates iOS Swift client SDKs from an OpenAPI 3.x spec — protocols (one per tag) with `async throws` requirements, `Codable` structs, `String`-raw `Codable` enums, plus a default `URLSession<Tag>API` impl class that wires up `URLSession`/`JSONEncoder`/`JSONDecoder` and emits real Swift statements (no string templates) for path/query/header dispatch and JSON / octet-stream body encoding. Multipart and form-urlencoded bodies throw a sentinel `URLSessionAPIError.unimplementedBody(mediaType:)`. Reuses the same hey-api IR pipeline as `@ahmedrowaihi/openapi-kotlin` so 2.0/3.0/3.1 inputs produce the same output.
