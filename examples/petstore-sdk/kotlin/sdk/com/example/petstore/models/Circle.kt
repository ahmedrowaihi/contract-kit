package com.example.petstore.models

import kotlinx.serialization.Serializable

@Serializable
public data class Circle(
    public val kind: Circle_Kind,
    public val radius: Double,
)
