package com.example.petstore.model

import kotlinx.serialization.Serializable

@Serializable
data class Circle(
    val kind: Circle_Kind,
    val radius: Double,
)
