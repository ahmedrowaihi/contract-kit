# petstore-sdk — multi-target SDK generation demo

End-to-end demo: **one OpenAPI spec → multiple platform SDKs**, the central use case for the native-client codegen story in this repo.

The shared spec lives at [`../../fixtures/petstore.yaml`](../../fixtures/petstore.yaml) (also consumed by `examples/orpc-basic`). Each platform has its own `<lang>/` directory containing a `gen.ts` script, the generated `sdk/` tree, and (where wired) an `example/` consumer demo. New languages drop in as siblings without disturbing the others.

## Targets

| Target | Status | Generator | Stack |
|---|---|---|---|
| Kotlin (Android) | ✓ | [`@ahmedrowaihi/openapi-kotlin`](../../packages/openapi-kotlin) | Retrofit 2 + kotlinx-serialization + suspend |
| Swift (iOS) | ✓ | [`@ahmedrowaihi/openapi-swift`](../../packages/openapi-swift) | Protocols + `Codable` + async/throws + emitted URLSession impl |

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

Each `sdk-<lang>/` directory is committed so PRs can review codegen diffs whenever a generator changes.

## Layout

One subdir per target language. Each follows the same shape:

```
examples/petstore-sdk/
├── kotlin/
│   ├── gen.ts                         ← reads fixtures/petstore.yaml → emits sdk/
│   └── sdk/
│       └── com/example/petstore/
│           ├── PetApi.kt              ← Retrofit interface, suspend funs
│           ├── StoreApi.kt
│           └── model/
│               ├── Pet.kt             ← @Serializable data class
│               └── …
└── swift/
    ├── gen.ts                         ← reads fixtures/petstore.yaml → emits sdk/
    └── sdk/
        ├── API/
        │   ├── PetAPI.swift           ← protocol with async-throws funcs
        │   ├── URLSessionPetAPI.swift ← default impl (one per tag)
        │   ├── APIClient.swift        ← runtime helper: session, codecs, dispatch
        │   ├── APIError.swift         ← typed errors (4XX/5XX/decode/transport)
        │   ├── Auth.swift             ← bearer / apiKey / basic
        │   └── …
        └── Models/
            ├── Pet.swift              ← Codable struct
            └── …
```

Adding a new language is a copy of the pattern: `<lang>/gen.ts` writes into `<lang>/sdk/`.

## Adopting in a real Android project

Copy `kotlin/sdk/com/example/petstore/` into your module's `src/main/kotlin/`, then add the runtime dependencies. The generated SDK is **pure contract** — interfaces and DTOs only. You bring the networking layer.

### Gradle deps

```gradle
plugins { id "kotlinx-serialization" }
dependencies {
    implementation "com.squareup.retrofit2:retrofit:2.9.0"
    implementation "com.jakewharton.retrofit:retrofit2-kotlinx-serialization-converter:1.0.0"
    implementation "org.jetbrains.kotlinx:kotlinx-serialization-json:1.5.0"
    implementation "com.squareup.okhttp3:logging-interceptor:4.12.0"  // optional
}
```

### 1. Wire Retrofit + the SDK

```kotlin
import com.example.petstore.PetApi
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

object Network {
    private val json = Json {
        ignoreUnknownKeys = true   // server can add fields without breaking the client
        coerceInputValues = true   // null on a non-null field uses the default
    }

    private val client = OkHttpClient.Builder()
        .addInterceptor(HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC })
        .addInterceptor { chain ->
            val req = chain.request().newBuilder()
                .addHeader("Authorization", "Bearer ${TokenStore.access}")
                .build()
            chain.proceed(req)
        }
        .build()

    val retrofit: Retrofit = Retrofit.Builder()
        .baseUrl("https://petstore3.swagger.io/api/v3/")
        .client(client)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()

    val pet: PetApi = retrofit.create(PetApi::class.java)
}
```

### 2. Call from a ViewModel/repo

```kotlin
class PetRepo(private val api: PetApi = Network.pet) {
    suspend fun byId(id: Long): Pet = api.getPetById(id)

    suspend fun available(): List<Pet> =
        api.findPetsByStatus(FindPetsByStatus_Param_Status.Available)
}

class PetViewModel(private val repo: PetRepo = PetRepo()) : ViewModel() {
    private val _state = MutableStateFlow<UiState>(UiState.Idle)
    val state: StateFlow<UiState> = _state

    fun load(id: Long) = viewModelScope.launch {
        _state.value = UiState.Loading
        runCatching { repo.byId(id) }
            .onSuccess { _state.value = UiState.Ready(it) }
            .onFailure { _state.value = UiState.Error(it.message ?: "fail") }
    }
}
```

### 3. With Hilt DI (matches the `podcast-android` pattern)

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides @Singleton
    fun json(): Json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
    }

    @Provides @Singleton
    fun okHttp(): OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(AuthInterceptor())
        .build()

    @Provides @Singleton
    fun retrofit(client: OkHttpClient, json: Json): Retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.BASE_URL)
        .client(client)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()

    @Provides @Singleton fun petApi(r: Retrofit): PetApi = r.create(PetApi::class.java)
    @Provides @Singleton fun storeApi(r: Retrofit): StoreApi = r.create(StoreApi::class.java)
    @Provides @Singleton fun userApi(r: Retrofit): UserApi = r.create(UserApi::class.java)
}

class PetRepo @Inject constructor(private val api: PetApi) {
    suspend fun byId(id: Long): Pet = api.getPetById(id)
}
```

### 4. Typed errors (optional layer on top)

```kotlin
sealed interface ApiResult<out T> {
    data class Ok<T>(val data: T) : ApiResult<T>
    data class HttpError(val code: Int, val body: String?) : ApiResult<Nothing>
    data class NetworkError(val cause: Throwable) : ApiResult<Nothing>
}

suspend inline fun <T> apiCall(block: () -> T): ApiResult<T> = try {
    ApiResult.Ok(block())
} catch (e: HttpException) {
    ApiResult.HttpError(e.code(), e.response()?.errorBody()?.string())
} catch (e: IOException) {
    ApiResult.NetworkError(e)
}

// usage
when (val r = apiCall { api.getPetById(1L) }) {
    is ApiResult.Ok          -> show(r.data)
    is ApiResult.HttpError   -> showError("HTTP ${r.code}")
    is ApiResult.NetworkError -> showError("Network down")
}
```

## Adopting in a real iOS project

Two consumption modes, picked at gen time:

- **Drop into an Xcode target** (default) — paste `swift/sdk/API/` + `swift/sdk/Models/` into your app's target sources. Same module, no `import` needed inside your own files. The petstore demo emits this shape.
- **Standalone SwiftPM library** — pass `package: { name: "YourSDK" }` to `generate()` and a `Package.swift` is emitted alongside the source. Consumers reach for it via `.package(path: …)` (or a git URL once published) and `import YourSDK`. Use this when the SDK is shared across apps or lives in its own repo.

The SDK is self-contained — Foundation only, no third-party deps either way.

## Customizing

Each `<lang>/gen.ts` is a thin wrapper. To customize Kotlin output (package name, layout, file placement), edit [`kotlin/gen.ts`](./kotlin/gen.ts):

```ts
const files = buildKotlinProject([...schemaDecls, ...opDecls], {
    packageName: "com.example.petstore",
    layout: "split",            // or "flat"
    fileLocation: (decl) => …,  // full per-decl override
});
```

Swift output ([`swift/gen.ts`](./swift/gen.ts)) accepts the same shape — `layout`, `fileLocation`, plus `openImpl: true` to emit the URLSession impl class as `open` (subclassable) instead of `final`:

```ts
const files = buildSwiftProject([...schemaDecls, ...opDecls], {
    layout: "split",            // API/ + Models/ (default), or "flat"
    openImpl: true,             // for projects that override impl methods in tests
    fileLocation: (decl) => …,  // full per-decl override
});
```
