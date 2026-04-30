package com.example.petstore.api

import java.util.Base64
import okhttp3.HttpUrl
import okhttp3.Request

/**
 * Auth schemes consumers reach for in practice:
 *
 *  - `Bearer(token)`            — `Authorization: Bearer <token>`.
 *  - `ApiKey(name, value, in)`  — header / query / cookie placement,
 *                                  matching the spec's
 *                                  `securitySchemes.<name>.in`.
 *  - `Basic(username, password)` — `Authorization: Basic <base64>`.
 *
 * Per-operation auth is auto-wired by the generator when an op has
 * `security` requirements; it walks the requirement names and applies
 * any matching scheme value the consumer has placed on `APIClient.auth`.
 *
 * `apply` mutates the request builder in-place for header / cookie
 * auth and returns the (possibly rewritten) `HttpUrl` so query auth
 * can re-thread its name=value into the URL.
 */
public sealed class Auth {
    public abstract fun apply(builder: Request.Builder, url: HttpUrl): HttpUrl

    public data class Bearer(public val token: String) : Auth() {
        override fun apply(builder: Request.Builder, url: HttpUrl): HttpUrl {
            builder.header("Authorization", "Bearer $token")
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
                    val cookie = "$name=$value"
                    val existing = builder.build().header("Cookie")
                    builder.header("Cookie", existing?.let { "$it; $cookie" } ?: cookie)
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
                .encodeToString("$username:$password".toByteArray(Charsets.UTF_8))
            builder.header("Authorization", "Basic $encoded")
            return url
        }
    }
}
