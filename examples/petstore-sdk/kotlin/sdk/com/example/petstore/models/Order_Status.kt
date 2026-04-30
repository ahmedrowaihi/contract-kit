package com.example.petstore.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
public enum class Order_Status(
    public val raw: String,
) {
    @SerialName("placed") PLACED("placed"),
    @SerialName("approved") APPROVED("approved"),
    @SerialName("delivered") DELIVERED("delivered"),
}
