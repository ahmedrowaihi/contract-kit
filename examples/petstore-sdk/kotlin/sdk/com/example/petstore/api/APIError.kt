package com.example.petstore.api

/**
 * The typed error every impl method throws on non-2xx responses.
 *
 *  - `ClientError(statusCode, body)`     — 4XX
 *  - `ServerError(statusCode, body)`     — 5XX
 *  - `UnexpectedStatus(statusCode, body)` — 1XX/3XX/anything outside 2-5
 *  - `DecodingFailed(cause)`             — kotlinx-serialization threw on a 2XX body
 *  - `Transport(cause)`                  — OkHttp / network-layer failure
 *
 * Consumers `catch` and pattern-match. Bodies are surfaced as raw
 * `ByteArray` so callers can decode error envelopes themselves with the
 * codec they prefer.
 */
public sealed class APIError(message: String? = null, cause: Throwable? = null) :
    RuntimeException(message, cause) {

    public class ClientError(
        public val statusCode: Int,
        public val body: ByteArray,
    ) : APIError("Client error: $statusCode")

    public class ServerError(
        public val statusCode: Int,
        public val body: ByteArray,
    ) : APIError("Server error: $statusCode")

    public class UnexpectedStatus(
        public val statusCode: Int,
        public val body: ByteArray,
    ) : APIError("Unexpected status: $statusCode")

    public class DecodingFailed(cause: Throwable) :
        APIError("Decoding failed: ${cause.message}", cause)

    public class Transport(cause: Throwable) :
        APIError("Transport failure: ${cause.message}", cause)
}
