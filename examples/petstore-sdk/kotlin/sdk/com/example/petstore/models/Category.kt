package com.example.petstore.models

import kotlinx.serialization.Serializable

@Serializable
public data class Category(
    public val id: Long? = null,
    public val name: String? = null,
)
