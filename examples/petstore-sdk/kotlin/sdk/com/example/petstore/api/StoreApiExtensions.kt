package com.example.petstore.api

import com.example.petstore.models.*
import okhttp3.Response

/** GET /store/inventory */
public suspend fun StoreApi.getInventory(): Map<String, Int> {
    return this.getInventory(options = RequestOptions())
}

/** GET /store/inventory */
public suspend fun StoreApi.getInventoryWithResponse(): Pair<Map<String, Int>, Response> {
    return this.getInventoryWithResponse(options = RequestOptions())
}

/** POST /store/order */
public suspend fun StoreApi.placeOrder(
    body: Order
): Order {
    return this.placeOrder(body = body, options = RequestOptions())
}

/** POST /store/order */
public suspend fun StoreApi.placeOrderWithResponse(
    body: Order
): Pair<Order, Response> {
    return this.placeOrderWithResponse(body = body, options = RequestOptions())
}

/** GET /store/order/{orderId} */
public suspend fun StoreApi.getOrderById(
    orderId: Long
): Order {
    return this.getOrderById(orderId = orderId, options = RequestOptions())
}

/** GET /store/order/{orderId} */
public suspend fun StoreApi.getOrderByIdWithResponse(
    orderId: Long
): Pair<Order, Response> {
    return this.getOrderByIdWithResponse(orderId = orderId, options = RequestOptions())
}

/** DELETE /store/order/{orderId} */
public suspend fun StoreApi.deleteOrder(
    orderId: Long
) {
    this.deleteOrder(orderId = orderId, options = RequestOptions())
}

/** DELETE /store/order/{orderId} */
public suspend fun StoreApi.deleteOrderWithResponse(
    orderId: Long
): Response {
    return this.deleteOrderWithResponse(orderId = orderId, options = RequestOptions())
}

/** POST /shapes */
public suspend fun StoreApi.createShape(
    body: ByteArray
): CreateShape_Response {
    return this.createShape(body = body, options = RequestOptions())
}

/** POST /shapes */
public suspend fun StoreApi.createShapeWithResponse(
    body: ByteArray
): Pair<CreateShape_Response, Response> {
    return this.createShapeWithResponse(body = body, options = RequestOptions())
}

/** POST /measurements */
public suspend fun StoreApi.submitMeasurement(
    body: SubmitMeasurement_Body
) {
    this.submitMeasurement(body = body, options = RequestOptions())
}

/** POST /measurements */
public suspend fun StoreApi.submitMeasurementWithResponse(
    body: SubmitMeasurement_Body
): Response {
    return this.submitMeasurementWithResponse(body = body, options = RequestOptions())
}
