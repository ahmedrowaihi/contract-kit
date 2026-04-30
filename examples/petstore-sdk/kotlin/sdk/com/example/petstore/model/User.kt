package com.example.petstore.model

import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: Long?,
    val username: String?,
    val firstName: String?,
    val lastName: String?,
    val email: String?,
    val password: String?,
    val phone: String?,
    val userStatus: Int?,
)
