package com.example.petstore.model

import kotlinx.serialization.Serializable

@Serializable
data class SubmitMeasurement_Body(
    val value: Double,
)
