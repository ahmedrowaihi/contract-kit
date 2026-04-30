package com.example.petstore.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class Order_Status {
    @SerialName("placed") Placed,
    @SerialName("approved") Approved,
    @SerialName("delivered") Delivered,
}
