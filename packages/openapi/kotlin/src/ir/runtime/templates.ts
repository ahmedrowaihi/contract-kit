/**
 * Runtime helper sources. These files ship verbatim into every generated
 * SDK — no spec-driven content beyond the package name. Encoding them as
 * fixed Kotlin strings (rather than DSL-built) keeps the codegen surface
 * small: the DSL only has to model what the per-operation impl actually
 * uses.
 *
 * Convention: `__PACKAGE__` is replaced by the consumer-chosen package
 * name during `buildRuntimeFiles(...)`.
 */

export interface RuntimeOpts {
  /** Emit `var auth: MutableMap<String, Auth>` on `APIClient` and the
   *  `Auth` / `APIKeyLocation` files. Set when the spec declares any
   *  `securitySchemes`. */
  hasAuth: boolean;
  /** Emit the `multipart/form-data` helper. Set when at least one op has
   *  a `multipart/form-data` body. */
  hasMultipart: boolean;
  /** Emit the `application/x-www-form-urlencoded` helper file (`FormUrlEncoder`
   *  object). Currently this is folded into ad-hoc `FormBody.Builder` calls
   *  in the impl, so we don't ship a dedicated runtime file for it. */
  hasFormUrlEncoded: boolean;
}

export interface RuntimeFile {
  name: string;
  content: string;
}

const API_INTERCEPTORS_KT = `package __PACKAGE__

import okhttp3.Request

/**
 * Bag of per-request mutation hooks. Mirrors hey-api's TS client where
 * \`client.interceptors.request.use(fn)\` registers an interceptor that
 * runs against every outgoing request. Multiple interceptors compose —
 * auth, logging, and tracing all coexist as separate entries instead
 * of being chained inside one closure.
 */
public class APIInterceptors {
    public val request: MutableList<suspend (Request) -> Request> = mutableListOf()
}
`;

const API_ERROR_KT = `package __PACKAGE__

/**
 * The typed error every impl method throws on non-2xx responses.
 *
 *  - \`ClientError(statusCode, body)\`     — 4XX
 *  - \`ServerError(statusCode, body)\`     — 5XX
 *  - \`UnexpectedStatus(statusCode, body)\` — 1XX/3XX/anything outside 2-5
 *  - \`DecodingFailed(cause)\`             — kotlinx-serialization threw on a 2XX body
 *  - \`Transport(cause)\`                  — OkHttp / network-layer failure
 *
 * Consumers \`catch\` and pattern-match. Bodies are surfaced as raw
 * \`ByteArray\` so callers can decode error envelopes themselves with the
 * codec they prefer.
 */
public sealed class APIError(message: String? = null, cause: Throwable? = null) :
    RuntimeException(message, cause) {

    public class ClientError(
        public val statusCode: Int,
        public val body: ByteArray,
    ) : APIError("Client error: \$statusCode")

    public class ServerError(
        public val statusCode: Int,
        public val body: ByteArray,
    ) : APIError("Server error: \$statusCode")

    public class UnexpectedStatus(
        public val statusCode: Int,
        public val body: ByteArray,
    ) : APIError("Unexpected status: \$statusCode")

    public class DecodingFailed(cause: Throwable) :
        APIError("Decoding failed: \${cause.message}", cause)

    public class Transport(cause: Throwable) :
        APIError("Transport failure: \${cause.message}", cause)
}
`;

const QUERY_STYLE_KT = `package __PACKAGE__

/**
 * Query-array serialization style — matches the OpenAPI 3 \`style\` field
 * for query parameters whose value is an array. The default is \`form\`
 * with explode=true; the others appear when the spec opts into them.
 */
public enum class QueryStyle {
    FORM,
    SPACE_DELIMITED,
    PIPE_DELIMITED,
}
`;

const URL_ENCODING_KT = `package __PACKAGE__

import okhttp3.HttpUrl

/**
 * Helpers used by generated impl code to add OpenAPI-shaped query
 * parameters onto an \`HttpUrl.Builder\` without each call site having to
 * know the style/explode rules.
 *
 *  - \`addScalar\` skips when the value is \`null\` so optional-and-missing
 *    params don't emit a key at all.
 *  - \`addArray\` honours \`style\` + \`explode\`: explode=true emits one
 *    \`?name=v\` per element; explode=false joins per the style separator.
 */
public object URLEncoding {
    public fun addScalar(builder: HttpUrl.Builder, name: String, value: Any?) {
        if (value == null) return
        builder.addQueryParameter(name, value.toString())
    }

    public fun addArray(
        builder: HttpUrl.Builder,
        name: String,
        values: List<Any>?,
        style: QueryStyle = QueryStyle.FORM,
        explode: Boolean = true,
    ) {
        if (values == null) return
        if (explode) {
            for (v in values) builder.addQueryParameter(name, v.toString())
            return
        }
        val sep = when (style) {
            QueryStyle.FORM -> ","
            QueryStyle.SPACE_DELIMITED -> " "
            QueryStyle.PIPE_DELIMITED -> "|"
        }
        builder.addQueryParameter(name, values.joinToString(sep) { it.toString() })
    }
}
`;

const MULTIPART_KT = `package __PACKAGE__

import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody

/**
 * Thin wrapper over OkHttp's \`MultipartBody.Builder\` — keeps the impl
 * code symmetric with the JSON / form-urlencoded paths.
 *
 *  - \`appendText(name, value)\`           — text part.
 *  - \`appendFile(name, filename, bytes,\`
 *    \`mimeType)\`                          — binary part.
 *  - \`build()\`                            — finalizes and returns a
 *                                            \`RequestBody\` ready to pass
 *                                            into \`.method("POST", body)\`.
 */
public class MultipartFormBody {
    private val builder: MultipartBody.Builder =
        MultipartBody.Builder().setType(MultipartBody.FORM)

    public fun appendText(name: String, value: String) {
        builder.addFormDataPart(name, value)
    }

    public fun appendFile(
        name: String,
        filename: String,
        bytes: ByteArray,
        mimeType: String = "application/octet-stream",
    ) {
        val body: RequestBody = bytes.toRequestBody(mimeType.toMediaTypeOrNull())
        builder.addFormDataPart(name, filename, body)
    }

    public fun build(): RequestBody = builder.build()
}
`;

const REQUEST_OPTIONS_KT = `package __PACKAGE__

import okhttp3.HttpUrl
import okhttp3.Request
import okhttp3.Response

/**
 * Per-call options bag — every generated method takes a
 * \`RequestOptions\` last param. Mirrors hey-api's TS SDK options shape.
 *
 *  - \`client\`               — override the impl's bound \`APIClient\`.
 *  - \`baseUrl\`              — override \`client.baseUrl\` for one call.
 *  - \`timeout\`              — per-call call-timeout in milliseconds.
 *  - \`headers\`              — extra/override headers, applied last.
 *  - \`requestInterceptors\`  — extra suspend interceptors, run after
 *                              client-level ones.
 *  - \`responseValidator\`    — runs after a 2xx response; throwing
 *                              converts the call into an exception.
 *  - \`responseTransformer\`  — rewrite the response body before decode.
 */
public data class RequestOptions(
    public val client: APIClient? = null,
    public val baseUrl: HttpUrl? = null,
    public val timeout: Long? = null,
    public val headers: Map<String, String> = emptyMap(),
    public val requestInterceptors: List<suspend (Request) -> Request> = emptyList(),
    public val responseValidator: (suspend (ByteArray, Response) -> Unit)? = null,
    public val responseTransformer: (suspend (ByteArray) -> ByteArray)? = null,
)
`;

const API_KEY_LOCATION_KT = `package __PACKAGE__

public enum class APIKeyLocation {
    HEADER,
    QUERY,
    COOKIE,
}
`;

const AUTH_KT = `package __PACKAGE__

import java.util.Base64
import okhttp3.HttpUrl
import okhttp3.Request

/**
 * Auth schemes consumers reach for in practice:
 *
 *  - \`Bearer(token)\`            — \`Authorization: Bearer <token>\`.
 *  - \`ApiKey(name, value, in)\`  — header / query / cookie placement,
 *                                  matching the spec's
 *                                  \`securitySchemes.<name>.in\`.
 *  - \`Basic(username, password)\` — \`Authorization: Basic <base64>\`.
 *
 * Per-operation auth is auto-wired by the generator when an op has
 * \`security\` requirements; it walks the requirement names and applies
 * any matching scheme value the consumer has placed on \`APIClient.auth\`.
 *
 * \`apply\` mutates the request builder in-place for header / cookie
 * auth and returns the (possibly rewritten) \`HttpUrl\` so query auth
 * can re-thread its name=value into the URL.
 */
public sealed class Auth {
    public abstract fun apply(builder: Request.Builder, url: HttpUrl): HttpUrl

    public data class Bearer(public val token: String) : Auth() {
        override fun apply(builder: Request.Builder, url: HttpUrl): HttpUrl {
            builder.header("Authorization", "Bearer \$token")
            return url
        }
    }

    public data class ApiKey(
        public val name: String,
        public val value: String,
        public val location: APIKeyLocation,
    ) : Auth() {
        override fun apply(builder: Request.Builder, url: HttpUrl): HttpUrl =
            when (location) {
                APIKeyLocation.HEADER -> {
                    builder.header(name, value)
                    url
                }
                APIKeyLocation.QUERY ->
                    url.newBuilder().addQueryParameter(name, value).build()
                APIKeyLocation.COOKIE -> {
                    val cookie = "\$name=\$value"
                    val existing = builder.build().header("Cookie")
                    builder.header("Cookie", existing?.let { "\$it; \$cookie" } ?: cookie)
                    url
                }
            }
    }

    public data class Basic(
        public val username: String,
        public val password: String,
    ) : Auth() {
        override fun apply(builder: Request.Builder, url: HttpUrl): HttpUrl {
            val encoded = Base64.getEncoder()
                .encodeToString("\$username:\$password".toByteArray(Charsets.UTF_8))
            builder.header("Authorization", "Basic \$encoded")
            return url
        }
    }
}
`;

const API_CLIENT_KT_BASE = `package __PACKAGE__

import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import okhttp3.HttpUrl
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response

/**
 * Runtime helper every per-tag impl class delegates to. Owns the
 * transport-level concerns — \`OkHttpClient\`, \`Json\`, the interceptor
 * pipeline — and provides one source of truth for status-code
 * dispatch and decoding.
 *
 *  - \`execute<T>(request, deserializer, …)\`       — decodes a 2xx body to \`T\`.
 *  - \`executeUnit(request, …)\`                    — discards the body.
 *  - \`executeWithResponse<T>(request, deserializer,\`
 *    \`…)\`                                          — decode + raw \`Response\`.
 *  - \`executeUnitWithResponse(request, …)\`        — raw \`Response\` only.
 *  - \`executeRaw(request, …)\`                     — raw \`(ByteArray, Response)\`,
 *                                                    used by multi-2xx ops.
 *
 * Status-code dispatch lives in \`sendAndDispatch\`; 2xx returns the
 * body bytes, 4xx/5xx throw the matching \`APIError\` subclass.
 */
public class APIClient(
    public var baseUrl: HttpUrl,
    public val httpClient: OkHttpClient = OkHttpClient(),
    public val json: Json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    },
    public val interceptors: APIInterceptors = APIInterceptors(),__AUTH_FIELD__
) {
    public suspend fun <T> execute(
        request: Request,
        deserializer: kotlinx.serialization.DeserializationStrategy<T>,
        timeout: Long? = null,
        extraInterceptors: List<suspend (Request) -> Request> = emptyList(),
        responseValidator: (suspend (ByteArray, Response) -> Unit)? = null,
        responseTransformer: (suspend (ByteArray) -> ByteArray)? = null,
    ): T {
        val (data, response) = sendAndDispatch(request, timeout, extraInterceptors)
        responseValidator?.invoke(data, response)
        val body = responseTransformer?.invoke(data) ?: data
        return try {
            json.decodeFromString(deserializer, body.decodeToString())
        } catch (e: Throwable) {
            throw APIError.DecodingFailed(e)
        }
    }

    public suspend fun executeUnit(
        request: Request,
        timeout: Long? = null,
        extraInterceptors: List<suspend (Request) -> Request> = emptyList(),
        responseValidator: (suspend (ByteArray, Response) -> Unit)? = null,
    ) {
        val (data, response) = sendAndDispatch(request, timeout, extraInterceptors)
        responseValidator?.invoke(data, response)
    }

    public suspend fun <T> executeWithResponse(
        request: Request,
        deserializer: kotlinx.serialization.DeserializationStrategy<T>,
        timeout: Long? = null,
        extraInterceptors: List<suspend (Request) -> Request> = emptyList(),
        responseValidator: (suspend (ByteArray, Response) -> Unit)? = null,
        responseTransformer: (suspend (ByteArray) -> ByteArray)? = null,
    ): Pair<T, Response> {
        val (data, response) = sendAndDispatch(request, timeout, extraInterceptors)
        responseValidator?.invoke(data, response)
        val body = responseTransformer?.invoke(data) ?: data
        return try {
            json.decodeFromString(deserializer, body.decodeToString()) to response
        } catch (e: Throwable) {
            throw APIError.DecodingFailed(e)
        }
    }

    public suspend fun executeUnitWithResponse(
        request: Request,
        timeout: Long? = null,
        extraInterceptors: List<suspend (Request) -> Request> = emptyList(),
        responseValidator: (suspend (ByteArray, Response) -> Unit)? = null,
    ): Response {
        val (data, response) = sendAndDispatch(request, timeout, extraInterceptors)
        responseValidator?.invoke(data, response)
        return response
    }

    public suspend fun executeRaw(
        request: Request,
        timeout: Long? = null,
        extraInterceptors: List<suspend (Request) -> Request> = emptyList(),
        responseValidator: (suspend (ByteArray, Response) -> Unit)? = null,
        responseTransformer: (suspend (ByteArray) -> ByteArray)? = null,
    ): Pair<ByteArray, Response> {
        val (data, response) = sendAndDispatch(request, timeout, extraInterceptors)
        responseValidator?.invoke(data, response)
        val body = responseTransformer?.invoke(data) ?: data
        return body to response
    }

    private suspend fun sendAndDispatch(
        request: Request,
        timeout: Long?,
        extraInterceptors: List<suspend (Request) -> Request>,
    ): Pair<ByteArray, Response> {
        var req = request
        for (interceptor in interceptors.request) req = interceptor(req)
        for (interceptor in extraInterceptors) req = interceptor(req)
        val callClient = if (timeout == null) httpClient else
            httpClient.newBuilder().callTimeout(timeout, TimeUnit.MILLISECONDS).build()
        val response = try {
            withContext(Dispatchers.IO) {
                callClient.newCall(req).execute()
            }
        } catch (e: Throwable) {
            throw APIError.Transport(e)
        }
        val body = response.body?.bytes() ?: ByteArray(0)
        return when (val code = response.code) {
            in 200..299 -> body to response
            in 400..499 -> throw APIError.ClientError(code, body)
            in 500..599 -> throw APIError.ServerError(code, body)
            else -> throw APIError.UnexpectedStatus(code, body)
        }
    }
}
`;

export function apiClientKt(opts: RuntimeOpts): string {
  const authField = opts.hasAuth
    ? "\n    public val auth: MutableMap<String, Auth> = mutableMapOf(),"
    : "";
  return API_CLIENT_KT_BASE.replace("__AUTH_FIELD__", authField);
}

/** Ordered runtime files. The orchestrator places them under `API/`. */
export function buildRuntimeFiles(
  opts: RuntimeOpts,
  pkg: string,
): RuntimeFile[] {
  const subst = (s: string) => s.replace(/__PACKAGE__/g, pkg);
  const files: RuntimeFile[] = [
    { name: "APIClient.kt", content: subst(apiClientKt(opts)) },
    { name: "APIError.kt", content: subst(API_ERROR_KT) },
    { name: "APIInterceptors.kt", content: subst(API_INTERCEPTORS_KT) },
    { name: "QueryStyle.kt", content: subst(QUERY_STYLE_KT) },
    { name: "URLEncoding.kt", content: subst(URL_ENCODING_KT) },
    { name: "RequestOptions.kt", content: subst(REQUEST_OPTIONS_KT) },
  ];
  if (opts.hasAuth) {
    files.push({ name: "Auth.kt", content: subst(AUTH_KT) });
    files.push({
      name: "APIKeyLocation.kt",
      content: subst(API_KEY_LOCATION_KT),
    });
  }
  if (opts.hasMultipart) {
    files.push({
      name: "MultipartFormBody.kt",
      content: subst(MULTIPART_KT),
    });
  }
  return files;
}
