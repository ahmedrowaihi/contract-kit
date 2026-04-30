package com.example.petstore.models

import kotlinx.serialization.Serializable

@Serializable
public data class SubmitTags_Body(
    public val tags: List<String>,
)
