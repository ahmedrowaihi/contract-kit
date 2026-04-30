package com.example.petstore.model

import kotlinx.serialization.Serializable

@Serializable
data class Tag(
    val id: Long?,
    val name: String?,
)
