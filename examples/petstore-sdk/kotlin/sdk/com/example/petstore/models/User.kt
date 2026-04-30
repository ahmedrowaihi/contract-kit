package com.example.petstore.models

import kotlinx.serialization.Serializable

@Serializable
public data class User(
    public val id: Long? = null,
    public val username: String? = null,
    public val firstName: String? = null,
    public val lastName: String? = null,
    public val email: String? = null,
    public val password: String? = null,
    public val phone: String? = null,
    public val userStatus: Int? = null,
)
