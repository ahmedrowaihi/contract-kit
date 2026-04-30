package com.example.petstore.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class Circle_Kind {
    @SerialName("circle") Circle,
}
