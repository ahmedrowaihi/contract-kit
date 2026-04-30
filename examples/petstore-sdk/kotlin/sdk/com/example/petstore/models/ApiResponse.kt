package com.example.petstore.models

import kotlinx.serialization.Serializable

@Serializable
public data class ApiResponse(
    public val code: Int? = null,
    public val type: String? = null,
    public val message: String? = null,
)
