package com.example.petstore.api

import com.example.petstore.models.*
import okhttp3.Response

public interface StoreApi {
    /** GET /store/inventory */
    suspend fun getInventory(
        options: RequestOptions
    ): Map<String, Int>

    /** GET /store/inventory */
    suspend fun getInventoryWithResponse(
        options: RequestOptions
    ): Pair<Map<String, Int>, Response>

    /** POST /store/order */
    suspend fun placeOrder(
        body: Order,
        options: RequestOptions
    ): Order

    /** POST /store/order */
    suspend fun placeOrderWithResponse(
        body: Order,
        options: RequestOptions
    ): Pair<Order, Response>

    /** GET /store/order/{orderId} */
    suspend fun getOrderById(
        orderId: Long,
        options: RequestOptions
    ): Order

    /** GET /store/order/{orderId} */
    suspend fun getOrderByIdWithResponse(
        orderId: Long,
        options: RequestOptions
    ): Pair<Order, Response>

    /** DELETE /store/order/{orderId} */
    suspend fun deleteOrder(
        orderId: Long,
        options: RequestOptions
    )

    /** DELETE /store/order/{orderId} */
    suspend fun deleteOrderWithResponse(
        orderId: Long,
        options: RequestOptions
    ): Response

    /** POST /shapes */
    suspend fun createShape(
        body: ByteArray,
        options: RequestOptions
    ): CreateShape_Response

    /** POST /shapes */
    suspend fun createShapeWithResponse(
        body: ByteArray,
        options: RequestOptions
    ): Pair<CreateShape_Response, Response>

    /** POST /measurements */
    suspend fun submitMeasurement(
        body: SubmitMeasurement_Body,
        options: RequestOptions
    )

    /** POST /measurements */
    suspend fun submitMeasurementWithResponse(
        body: SubmitMeasurement_Body,
        options: RequestOptions
    ): Response
}
