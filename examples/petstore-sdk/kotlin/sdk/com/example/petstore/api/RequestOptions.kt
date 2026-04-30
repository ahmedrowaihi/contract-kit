package com.example.petstore.api

import okhttp3.HttpUrl
import okhttp3.Request
import okhttp3.Response

/**
 * Per-call options bag — every generated method takes a
 * `RequestOptions` last param. Mirrors hey-api's TS SDK options shape.
 *
 *  - `client`               — override the impl's bound `APIClient`.
 *  - `baseUrl`              — override `client.baseUrl` for one call.
 *  - `timeout`              — per-call call-timeout in milliseconds.
 *  - `headers`              — extra/override headers, applied last.
 *  - `requestInterceptors`  — extra suspend interceptors, run after
 *                              client-level ones.
 *  - `responseValidator`    — runs after a 2xx response; throwing
 *                              converts the call into an exception.
 *  - `responseTransformer`  — rewrite the response body before decode.
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
