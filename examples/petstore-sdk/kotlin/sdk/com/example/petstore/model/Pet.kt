package com.example.petstore.model

import kotlinx.serialization.Serializable

@Serializable
data class Pet(
    val id: Long?,
    val name: String,
    val category: Category?,
    val photoUrls: List<String>,
    val tags: List<Tag>?,
    val status: Pet_Status?,
)
