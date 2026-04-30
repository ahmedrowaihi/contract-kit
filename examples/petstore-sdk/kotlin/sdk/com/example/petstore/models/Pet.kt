package com.example.petstore.models

import kotlinx.serialization.Serializable

@Serializable
public data class Pet(
    public val id: Long? = null,
    public val name: String,
    public val category: Category? = null,
    public val photoUrls: List<String>,
    public val tags: List<Tag>? = null,
    public val status: Pet_Status? = null,
)
