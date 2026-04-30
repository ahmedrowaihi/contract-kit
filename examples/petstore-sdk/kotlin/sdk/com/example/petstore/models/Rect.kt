package com.example.petstore.models

import kotlinx.serialization.Serializable

@Serializable
public data class Rect(
    public val kind: Rect_Kind,
    public val width: Double,
    public val height: Double,
)
