package com.example.petstore.api

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
 * transport-level concerns — `OkHttpClient`, `Json`, the interceptor
 * pipeline — and provides one source of truth for status-code
 * dispatch and decoding.
 *
 *  - `execute<T>(request, deserializer, …)`       — decodes a 2xx body to `T`.
 *  - `executeUnit(request, …)`                    — discards the body.
 *  - `executeWithResponse<T>(request, deserializer,`
 *    `…)`                                          — decode + raw `Response`.
 *  - `executeUnitWithResponse(request, …)`        — raw `Response` only.
 *  - `executeRaw(request, …)`                     — raw `(ByteArray, Response)`,
 *                                                    used by multi-2xx ops.
 *
 * Status-code dispatch lives in `sendAndDispatch`; 2xx returns the
 * body bytes, 4xx/5xx throw the matching `APIError` subclass.
 */
public class APIClient(
    public var baseUrl: HttpUrl,
    public val httpClient: OkHttpClient = OkHttpClient(),
    public val json: Json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    },
    public val interceptors: APIInterceptors = APIInterceptors(),
    public val auth: MutableMap<String, Auth> = mutableMapOf(),
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
