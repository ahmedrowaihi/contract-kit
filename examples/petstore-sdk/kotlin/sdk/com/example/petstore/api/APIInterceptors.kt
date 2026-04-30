package com.example.petstore.api

import okhttp3.Request

/**
 * Bag of per-request mutation hooks. Mirrors hey-api's TS client where
 * `client.interceptors.request.use(fn)` registers an interceptor that
 * runs against every outgoing request. Multiple interceptors compose —
 * auth, logging, and tracing all coexist as separate entries instead
 * of being chained inside one closure.
 */
public class APIInterceptors {
    public val request: MutableList<suspend (Request) -> Request> = mutableListOf()
}
