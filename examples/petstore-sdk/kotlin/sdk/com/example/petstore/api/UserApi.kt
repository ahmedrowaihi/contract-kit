package com.example.petstore.api

import com.example.petstore.models.*
import okhttp3.Response

public interface UserApi {
    /** POST /user */
    suspend fun createUser(
        body: User,
        options: RequestOptions
    ): User

    /** POST /user */
    suspend fun createUserWithResponse(
        body: User,
        options: RequestOptions
    ): Pair<User, Response>

    /** POST /user/createWithList */
    suspend fun createUsersWithListInput(
        body: List<User>,
        options: RequestOptions
    ): User

    /** POST /user/createWithList */
    suspend fun createUsersWithListInputWithResponse(
        body: List<User>,
        options: RequestOptions
    ): Pair<User, Response>

    /** GET /user/login */
    suspend fun loginUser(
        username: String?,
        password: String?,
        options: RequestOptions
    ): String

    /** GET /user/login */
    suspend fun loginUserWithResponse(
        username: String?,
        password: String?,
        options: RequestOptions
    ): Pair<String, Response>

    /** GET /user/logout */
    suspend fun logoutUser(
        options: RequestOptions
    )

    /** GET /user/logout */
    suspend fun logoutUserWithResponse(
        options: RequestOptions
    ): Response

    /** GET /user/{username} */
    suspend fun getUserByName(
        username: String,
        options: RequestOptions
    ): User

    /** GET /user/{username} */
    suspend fun getUserByNameWithResponse(
        username: String,
        options: RequestOptions
    ): Pair<User, Response>

    /** PUT /user/{username} */
    suspend fun updateUser(
        username: String,
        body: User,
        options: RequestOptions
    )

    /** PUT /user/{username} */
    suspend fun updateUserWithResponse(
        username: String,
        body: User,
        options: RequestOptions
    ): Response

    /** DELETE /user/{username} */
    suspend fun deleteUser(
        username: String,
        options: RequestOptions
    )

    /** DELETE /user/{username} */
    suspend fun deleteUserWithResponse(
        username: String,
        options: RequestOptions
    ): Response

    /** POST /profile */
    suspend fun updateProfile(
        body: UpdateProfile_Body,
        options: RequestOptions
    ): UpdateProfile_Response

    /** POST /profile */
    suspend fun updateProfileWithResponse(
        body: UpdateProfile_Body,
        options: RequestOptions
    ): Pair<UpdateProfile_Response, Response>
}
