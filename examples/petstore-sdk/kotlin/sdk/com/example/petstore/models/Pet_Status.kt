package com.example.petstore.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
public enum class Pet_Status(
    public val raw: String,
) {
    @SerialName("available") AVAILABLE("available"),
    @SerialName("pending") PENDING("pending"),
    @SerialName("sold") SOLD("sold"),
}
