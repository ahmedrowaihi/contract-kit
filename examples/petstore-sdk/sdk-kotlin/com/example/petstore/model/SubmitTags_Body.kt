package com.example.petstore.model

import kotlinx.serialization.Serializable

@Serializable
data class SubmitTags_Body(
    val tags: List<String>,
)
