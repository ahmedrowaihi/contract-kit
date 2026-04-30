package com.example.petstore.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
public enum class Rect_Kind(
    public val raw: String,
) {
    @SerialName("rect") RECT("rect"),
}
