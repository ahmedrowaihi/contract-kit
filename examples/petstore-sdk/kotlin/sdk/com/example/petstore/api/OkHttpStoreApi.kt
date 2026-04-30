package com.example.petstore.api

import com.example.petstore.models.*
import kotlinx.serialization.builtins.MapSerializer
import kotlinx.serialization.builtins.serializer
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response

public class OkHttpStoreApi(
    public val client: APIClient,
) : StoreApi {
    /** GET /store/inventory */
    public override suspend fun getInventory(
        options: RequestOptions
    ): Map<String, Int> {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("store")
        urlBuilder.addPathSegment("inventory")
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("GET", null)
        var currentUrl = url
        for (schemeName in listOf("api_key")) {
            client.auth[schemeName]?.let { auth -> currentUrl = auth.apply(builder, currentUrl) }
        }
        builder.url(currentUrl)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.execute(builder.build(), MapSerializer(String.serializer(), Int.serializer()), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** GET /store/inventory */
    public override suspend fun getInventoryWithResponse(
        options: RequestOptions
    ): Pair<Map<String, Int>, Response> {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("store")
        urlBuilder.addPathSegment("inventory")
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("GET", null)
        var currentUrl = url
        for (schemeName in listOf("api_key")) {
            client.auth[schemeName]?.let { auth -> currentUrl = auth.apply(builder, currentUrl) }
        }
        builder.url(currentUrl)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.executeWithResponse(builder.build(), MapSerializer(String.serializer(), Int.serializer()), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** POST /store/order */
    public override suspend fun placeOrder(
        body: Order,
        options: RequestOptions
    ): Order {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("store")
        urlBuilder.addPathSegment("order")
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("POST", null)
        val payload = client.json.encodeToString(Order.serializer(), body)
        builder.method("POST", payload.toRequestBody("application/json".toMediaType()))
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.execute(builder.build(), Order.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** POST /store/order */
    public override suspend fun placeOrderWithResponse(
        body: Order,
        options: RequestOptions
    ): Pair<Order, Response> {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("store")
        urlBuilder.addPathSegment("order")
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("POST", null)
        val payload = client.json.encodeToString(Order.serializer(), body)
        builder.method("POST", payload.toRequestBody("application/json".toMediaType()))
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.executeWithResponse(builder.build(), Order.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** GET /store/order/{orderId} */
    public override suspend fun getOrderById(
        orderId: Long,
        options: RequestOptions
    ): Order {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("store")
        urlBuilder.addPathSegment("order")
        urlBuilder.addPathSegment(orderId.toString())
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("GET", null)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.execute(builder.build(), Order.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** GET /store/order/{orderId} */
    public override suspend fun getOrderByIdWithResponse(
        orderId: Long,
        options: RequestOptions
    ): Pair<Order, Response> {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("store")
        urlBuilder.addPathSegment("order")
        urlBuilder.addPathSegment(orderId.toString())
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("GET", null)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.executeWithResponse(builder.build(), Order.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** DELETE /store/order/{orderId} */
    public override suspend fun deleteOrder(
        orderId: Long,
        options: RequestOptions
    ) {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("store")
        urlBuilder.addPathSegment("order")
        urlBuilder.addPathSegment(orderId.toString())
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("DELETE", null)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        client.executeUnit(builder.build(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator)
    }

    /** DELETE /store/order/{orderId} */
    public override suspend fun deleteOrderWithResponse(
        orderId: Long,
        options: RequestOptions
    ): Response {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("store")
        urlBuilder.addPathSegment("order")
        urlBuilder.addPathSegment(orderId.toString())
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("DELETE", null)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.executeUnitWithResponse(builder.build(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator)
    }

    /** POST /shapes */
    public override suspend fun createShape(
        body: ByteArray,
        options: RequestOptions
    ): CreateShape_Response {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("shapes")
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("POST", null)
        builder.method("POST", body.toRequestBody("application/json".toMediaType()))
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.execute(builder.build(), CreateShape_Response.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** POST /shapes */
    public override suspend fun createShapeWithResponse(
        body: ByteArray,
        options: RequestOptions
    ): Pair<CreateShape_Response, Response> {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("shapes")
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("POST", null)
        builder.method("POST", body.toRequestBody("application/json".toMediaType()))
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.executeWithResponse(builder.build(), CreateShape_Response.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** POST /measurements */
    public override suspend fun submitMeasurement(
        body: SubmitMeasurement_Body,
        options: RequestOptions
    ) {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("measurements")
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("POST", null)
        val payload = client.json.encodeToString(SubmitMeasurement_Body.serializer(), body)
        builder.method("POST", payload.toRequestBody("application/json".toMediaType()))
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        client.executeUnit(builder.build(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator)
    }

    /** POST /measurements */
    public override suspend fun submitMeasurementWithResponse(
        body: SubmitMeasurement_Body,
        options: RequestOptions
    ): Response {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("measurements")
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("POST", null)
        val payload = client.json.encodeToString(SubmitMeasurement_Body.serializer(), body)
        builder.method("POST", payload.toRequestBody("application/json".toMediaType()))
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.executeUnitWithResponse(builder.build(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator)
    }
}
