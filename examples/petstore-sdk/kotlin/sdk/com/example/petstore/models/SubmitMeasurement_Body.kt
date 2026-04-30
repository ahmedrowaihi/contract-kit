package com.example.petstore.models

import kotlinx.serialization.Serializable

@Serializable
public data class SubmitMeasurement_Body(
    public val value: Double,
)
