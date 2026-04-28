package com.example.petstore.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class Pet_Status {
    @SerialName("available") Available,
    @SerialName("pending") Pending,
    @SerialName("sold") Sold,
}
