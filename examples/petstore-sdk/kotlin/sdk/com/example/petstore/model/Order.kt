package com.example.petstore.model

import kotlinx.serialization.Serializable

@Serializable
data class Order(
    val id: Long?,
    val petId: Long?,
    val quantity: Int?,
    val shipDate: String?,
    val status: Order_Status?,
    val complete: Boolean?,
)
