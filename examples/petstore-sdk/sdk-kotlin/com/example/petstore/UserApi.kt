package com.example.petstore

import com.example.petstore.model.UpdateProfile_Body
import com.example.petstore.model.UpdateProfile_Response
import com.example.petstore.model.User
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface UserApi {
    @POST("user")
    suspend fun createUser(
        @Body body: User,
    ): User

    @POST("user/createWithList")
    suspend fun createUsersWithListInput(
        @Body body: List<User>,
    ): User

    @GET("user/login")
    suspend fun loginUser(
        @Query("username") username: String? = null,
        @Query("password") password: String? = null,
    ): String

    @GET("user/logout")
    suspend fun logoutUser()

    @GET("user/{username}")
    suspend fun getUserByName(
        @Path("username") username: String,
    ): User

    @PUT("user/{username}")
    suspend fun updateUser(
        @Path("username") username: String,
        @Body body: User,
    )

    @DELETE("user/{username}")
    suspend fun deleteUser(
        @Path("username") username: String,
    )

    @POST("profile")
    suspend fun updateProfile(
        @Body body: UpdateProfile_Body,
    ): UpdateProfile_Response
}
