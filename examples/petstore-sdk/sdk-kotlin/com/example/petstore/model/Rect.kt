package com.example.petstore.model

import kotlinx.serialization.Serializable

@Serializable
data class Rect(
    val kind: Rect_Kind,
    val width: Double,
    val height: Double,
)
