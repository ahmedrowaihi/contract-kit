package com.example.petstore.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
public enum class Circle_Kind(
    public val raw: String,
) {
    @SerialName("circle") CIRCLE("circle"),
}
