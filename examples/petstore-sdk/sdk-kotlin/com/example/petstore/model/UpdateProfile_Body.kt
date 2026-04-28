package com.example.petstore.model

import kotlinx.serialization.Serializable

@Serializable
data class UpdateProfile_Body(
    val name: String,
    val nickname: String??,
)
