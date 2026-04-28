# petstore-sdk — multi-target SDK generation demo

End-to-end demo: **one OpenAPI spec → multiple platform SDKs**, the central use case for the native-client codegen story in this repo.

The shared spec lives at [`../../fixtures/petstore.yaml`](../../fixtures/petstore.yaml) (also consumed by `examples/orpc-basic`). Each platform has its own `*.gen.ts` that calls into the matching generator package and writes a `sdk-<lang>/` tree.

## Targets

| Target | Status | Generator | Stack |
|---|---|---|---|
| Kotlin (Android) | ✓ | [`@ahmedrowaihi/openapi-kotlin`](../../packages/openapi-kotlin) | Retrofit 2 + kotlinx-serialization + suspend |
| Swift (iOS) | _planned_ | `@ahmedrowaihi/openapi-swift` | URLSession + Codable + async throws |

## Run

```bash
# from repo root
pnpm install
pnpm --filter @ahmedrowaihi/openapi-kotlin build
pnpm --filter @ahmedrowaihi/example-petstore-sdk gen        # all targets
# or one at a time:
pnpm --filter @ahmedrowaihi/example-petstore-sdk gen:kotlin
```

Each `sdk-<lang>/` directory is committed so PRs can review codegen diffs whenever a generator changes.

## Layout

```
examples/petstore-sdk/
├── kotlin.gen.ts       ← reads fixtures/petstore.yaml → emits sdk-kotlin/
├── swift.gen.ts        ← (when openapi-swift lands)
└── sdk-kotlin/
    └── com/example/petstore/
        ├── PetApi.kt           ← Retrofit interface, suspend funs
        ├── StoreApi.kt
        ├── UserApi.kt
        └── model/
            ├── Pet.kt          ← @Serializable data class
            ├── Category.kt
            └── …
```

## Adopting in a real Android project

Copy `sdk-kotlin/com/example/petstore/` into your module's `src/main/kotlin/` and add the runtime deps:

```gradle
plugins { id "kotlinx-serialization" }
dependencies {
    implementation "com.squareup.retrofit2:retrofit:2.9.0"
    implementation "com.jakewharton.retrofit:retrofit2-kotlinx-serialization-converter:1.0.0"
    implementation "org.jetbrains.kotlinx:kotlinx-serialization-json:1.5.0"
}
```

Then wire up Retrofit:

```kotlin
val json = Json { ignoreUnknownKeys = true }
val retrofit = Retrofit.Builder()
    .baseUrl("https://petstore3.swagger.io/api/v3/")
    .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
    .build()

val petApi: PetApi = retrofit.create(PetApi::class.java)
val pet = petApi.getPetById(1L)
```

## Customizing

Each `*.gen.ts` is a thin wrapper. To customize Kotlin output (package name, layout, file placement), edit [`kotlin.gen.ts`](./kotlin.gen.ts):

```ts
const files = buildKotlinProject([...schemaDecls, ...opDecls], {
    packageName: "com.example.petstore",
    layout: "split",            // or "flat"
    fileLocation: (decl) => …,  // full per-decl override
});
```
