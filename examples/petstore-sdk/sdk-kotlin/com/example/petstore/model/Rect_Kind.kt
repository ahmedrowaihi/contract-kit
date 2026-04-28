package com.example.petstore.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class Rect_Kind {
    @SerialName("rect") Rect,
}
