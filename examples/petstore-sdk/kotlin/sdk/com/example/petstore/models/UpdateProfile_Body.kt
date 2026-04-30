package com.example.petstore.models

import kotlinx.serialization.Serializable

@Serializable
public data class UpdateProfile_Body(
    public val name: String,
    public val nickname: String? = null,
)
