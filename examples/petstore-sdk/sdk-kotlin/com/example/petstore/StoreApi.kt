package com.example.petstore

import com.example.petstore.model.CreateShape_Response
import com.example.petstore.model.Order
import com.example.petstore.model.SubmitMeasurement_Body
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface StoreApi {
    @GET("store/inventory")
    suspend fun getInventory(): Map<String, Int>

    @POST("store/order")
    suspend fun placeOrder(
        @Body body: Order,
    ): Order

    @GET("store/order/{orderId}")
    suspend fun getOrderById(
        @Path("orderId") orderId: Long,
    ): Order

    @DELETE("store/order/{orderId}")
    suspend fun deleteOrder(
        @Path("orderId") orderId: Long,
    )

    @POST("shapes")
    suspend fun createShape(
        @Body body: Any,
    ): CreateShape_Response

    @POST("measurements")
    suspend fun submitMeasurement(
        @Body body: SubmitMeasurement_Body,
    )
}
