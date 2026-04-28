# @ahmedrowaihi/openapi-kotlin

Generate idiomatic Android Kotlin client SDKs from an OpenAPI 3.x spec — Retrofit interfaces + `@Serializable` data classes + suspend functions, with full multipart/form/binary body support.

Built on the [`@hey-api`](https://github.com/hey-api/openapi-ts) toolchain (`@hey-api/json-schema-ref-parser` for spec loading, `@hey-api/shared` IR for normalization). 2.0 / 3.0 / 3.1 inputs all produce the same output.

Part of [contract-kit](https://github.com/ahmedrowaihi/contract-kit). Companion to the [`petstore-sdk` example](../../examples/petstore-sdk).

## Install

```bash
pnpm add @ahmedrowaihi/openapi-kotlin @ahmedrowaihi/openapi-tools @hey-api/shared @hey-api/spec-types
```

## Usage

### One-shot generation

```ts
import { generate } from "@ahmedrowaihi/openapi-kotlin";

await generate({
  input: "https://api.example.com/openapi.json",   // or "./openapi.yaml" or pre-parsed object
  output: "./sdk-kotlin",
  packageName: "com.example.api",
});
```

Reads any of: a filesystem path, an http(s) URL, or a pre-parsed object. YAML and JSON are both supported. External `$ref`s are bundled inline.

### Stage-by-stage (lower-level)

```ts
import {
  schemasToDecls,
  operationsToDecls,
  buildKotlinProject,
} from "@ahmedrowaihi/openapi-kotlin";
import { parseSpec } from "@ahmedrowaihi/openapi-tools/parse";

const ir = parseSpec(rawSpec);
const decls = [
  ...schemasToDecls(ir.components?.schemas ?? {}),
  ...operationsToDecls(ir.paths),
];
const files = buildKotlinProject(decls, {
  packageName: "com.example.api",
  layout: "split",   // or "flat"
});
// files: { path: string, content: string }[] — write where you want
```

## Output

### Schemas → data classes / enums / typealiases

OpenAPI:
```yaml
components:
  schemas:
    Pet:
      type: object
      required: [name, photoUrls]
      properties:
        id: { type: integer, format: int64 }
        name: { type: string }
        status: { type: string, enum: [available, pending, sold] }
        photoUrls: { type: array, items: { type: string } }
        category: { $ref: "#/components/schemas/Category" }
```

Kotlin:
```kotlin
package com.example.api.model

import kotlinx.serialization.Serializable

@Serializable
data class Pet(
    val name: String,
    val photoUrls: List<String>,
    val id: Long?,
    val status: Pet_Status?,
    val category: Category?,
)
```

Inline enums (`status` above) are promoted to a top-level `Pet_Status` `@Serializable enum class` with `@SerialName` per variant.

### Operations → Retrofit interfaces

OpenAPI tags become interfaces. Methods become annotated suspend functions. Required-first parameter ordering. Optional params get `? = null` defaults.

```kotlin
package com.example.api

import com.example.api.model.Pet
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

interface PetApi {
    @GET("pet/{petId}")
    suspend fun getPetById(
        @Path("petId") petId: Long,
    ): Pet

    @GET("pet/findByStatus")
    suspend fun findPetsByStatus(
        @Query("status") status: Pet_Status,
    ): List<Pet>
}
```

### Body media-type dispatch

| Input media type | Generated shape |
|---|---|
| `application/json` (and `+json`) | `@Body body: T` |
| `multipart/form-data` (object schema) | `@Multipart` + `@Part("name")` per property; binary fields → `MultipartBody.Part` |
| `application/x-www-form-urlencoded` (object schema) | `@FormUrlEncoded` + `@Field("name")` per property |
| `application/octet-stream`, `image/*`, etc. | `@Body body: RequestBody` (okhttp3) |

Empty 2xx responses (204, or 200 with no schema) emit no return type — Retrofit reads `Unit`.

## Output layout

Two built-in layouts plus a per-decl override:

```ts
// "split" (default): interfaces in <packageName>, models in <packageName>.model
generate({ ..., layout: "split" });
// → com/example/api/PetApi.kt
// → com/example/api/model/Pet.kt

// "flat": everything in <packageName>
generate({ ..., layout: "flat" });
// → com/example/api/PetApi.kt
// → com/example/api/Pet.kt

// custom: override per decl
generate({
  ...,
  fileLocation: (decl) => decl.kind === "interface"
    ? { pkg: "com.example.api", dir: "com/example/api" }
    : { pkg: "com.example.dto", dir: "com/example/dto" },
});
```

Imports are auto-resolved per file: cross-package generated refs, `kotlinx.serialization.*`, `retrofit2.http.*`, and `okhttp3.*` are imported only when actually used. Same-package refs are not imported.

## Consuming the output

The generated SDK is **pure contract** — interfaces and data classes only, no networking layer. Wire up Retrofit + kotlinx-serialization the same way you would for hand-written interfaces. See the [petstore-sdk example README](../../examples/petstore-sdk/README.md) for full setup, including OkHttp interceptors, Hilt DI, and a typed-error wrapper.

```gradle
plugins { id "kotlinx-serialization" }
dependencies {
    implementation "com.squareup.retrofit2:retrofit:2.9.0"
    implementation "com.jakewharton.retrofit:retrofit2-kotlinx-serialization-converter:1.0.0"
    implementation "org.jetbrains.kotlinx:kotlinx-serialization-json:1.5.0"
}
```

## API

| Export | Purpose |
| --- | --- |
| `generate(opts)` | High-level entry: load → IR → decls → files on disk. |
| `schemasToDecls(schemas)` | `IR.Model.components.schemas` → `KtDecl[]`. |
| `operationsToDecls(paths, opts?)` | `IR.PathsObject` → `KtDecl[]` (interfaces grouped by tag). |
| `buildKotlinProject(decls, opts)` | `KtDecl[]` → `{ path, content }[]` with auto-imports. |
| `printFile(file)` / `kt*` builders | Lower-level Kotlin AST + printer. |
