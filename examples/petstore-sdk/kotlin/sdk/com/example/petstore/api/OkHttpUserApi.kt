package com.example.petstore.api

import com.example.petstore.models.*
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.serializer
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response

public class OkHttpUserApi(
    public val client: APIClient,
) : UserApi {
    /** POST /user */
    public override suspend fun createUser(
        body: User,
        options: RequestOptions
    ): User {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("user")
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("POST", null)
        val payload = client.json.encodeToString(User.serializer(), body)
        builder.method("POST", payload.toRequestBody("application/json".toMediaType()))
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.execute(builder.build(), User.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** POST /user */
    public override suspend fun createUserWithResponse(
        body: User,
        options: RequestOptions
    ): Pair<User, Response> {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("user")
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("POST", null)
        val payload = client.json.encodeToString(User.serializer(), body)
        builder.method("POST", payload.toRequestBody("application/json".toMediaType()))
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.executeWithResponse(builder.build(), User.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** POST /user/createWithList */
    public override suspend fun createUsersWithListInput(
        body: List<User>,
        options: RequestOptions
    ): User {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("user")
        urlBuilder.addPathSegment("createWithList")
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("POST", null)
        val payload = client.json.encodeToString(ListSerializer(User.serializer()), body)
        builder.method("POST", payload.toRequestBody("application/json".toMediaType()))
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.execute(builder.build(), User.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** POST /user/createWithList */
    public override suspend fun createUsersWithListInputWithResponse(
        body: List<User>,
        options: RequestOptions
    ): Pair<User, Response> {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("user")
        urlBuilder.addPathSegment("createWithList")
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("POST", null)
        val payload = client.json.encodeToString(ListSerializer(User.serializer()), body)
        builder.method("POST", payload.toRequestBody("application/json".toMediaType()))
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.executeWithResponse(builder.build(), User.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** GET /user/login */
    public override suspend fun loginUser(
        username: String?,
        password: String?,
        options: RequestOptions
    ): String {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("user")
        urlBuilder.addPathSegment("login")
        URLEncoding.addScalar(urlBuilder, "username", username)
        URLEncoding.addScalar(urlBuilder, "password", password)
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("GET", null)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.execute(builder.build(), String.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** GET /user/login */
    public override suspend fun loginUserWithResponse(
        username: String?,
        password: String?,
        options: RequestOptions
    ): Pair<String, Response> {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("user")
        urlBuilder.addPathSegment("login")
        URLEncoding.addScalar(urlBuilder, "username", username)
        URLEncoding.addScalar(urlBuilder, "password", password)
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("GET", null)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.executeWithResponse(builder.build(), String.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** GET /user/logout */
    public override suspend fun logoutUser(
        options: RequestOptions
    ) {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("user")
        urlBuilder.addPathSegment("logout")
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("GET", null)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        client.executeUnit(builder.build(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator)
    }

    /** GET /user/logout */
    public override suspend fun logoutUserWithResponse(
        options: RequestOptions
    ): Response {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("user")
        urlBuilder.addPathSegment("logout")
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("GET", null)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.executeUnitWithResponse(builder.build(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator)
    }

    /** GET /user/{username} */
    public override suspend fun getUserByName(
        username: String,
        options: RequestOptions
    ): User {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("user")
        urlBuilder.addPathSegment(username.toString())
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("GET", null)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.execute(builder.build(), User.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** GET /user/{username} */
    public override suspend fun getUserByNameWithResponse(
        username: String,
        options: RequestOptions
    ): Pair<User, Response> {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("user")
        urlBuilder.addPathSegment(username.toString())
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("GET", null)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.executeWithResponse(builder.build(), User.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** PUT /user/{username} */
    public override suspend fun updateUser(
        username: String,
        body: User,
        options: RequestOptions
    ) {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("user")
        urlBuilder.addPathSegment(username.toString())
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("PUT", null)
        val payload = client.json.encodeToString(User.serializer(), body)
        builder.method("PUT", payload.toRequestBody("application/json".toMediaType()))
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        client.executeUnit(builder.build(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator)
    }

    /** PUT /user/{username} */
    public override suspend fun updateUserWithResponse(
        username: String,
        body: User,
        options: RequestOptions
    ): Response {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("user")
        urlBuilder.addPathSegment(username.toString())
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("PUT", null)
        val payload = client.json.encodeToString(User.serializer(), body)
        builder.method("PUT", payload.toRequestBody("application/json".toMediaType()))
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.executeUnitWithResponse(builder.build(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator)
    }

    /** DELETE /user/{username} */
    public override suspend fun deleteUser(
        username: String,
        options: RequestOptions
    ) {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("user")
        urlBuilder.addPathSegment(username.toString())
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("DELETE", null)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        client.executeUnit(builder.build(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator)
    }

    /** DELETE /user/{username} */
    public override suspend fun deleteUserWithResponse(
        username: String,
        options: RequestOptions
    ): Response {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("user")
        urlBuilder.addPathSegment(username.toString())
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("DELETE", null)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.executeUnitWithResponse(builder.build(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator)
    }

    /** POST /profile */
    public override suspend fun updateProfile(
        body: UpdateProfile_Body,
        options: RequestOptions
    ): UpdateProfile_Response {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("profile")
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("POST", null)
        val payload = client.json.encodeToString(UpdateProfile_Body.serializer(), body)
        builder.method("POST", payload.toRequestBody("application/json".toMediaType()))
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.execute(builder.build(), UpdateProfile_Response.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** POST /profile */
    public override suspend fun updateProfileWithResponse(
        body: UpdateProfile_Body,
        options: RequestOptions
    ): Pair<UpdateProfile_Response, Response> {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("profile")
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("POST", null)
        val payload = client.json.encodeToString(UpdateProfile_Body.serializer(), body)
        builder.method("POST", payload.toRequestBody("application/json".toMediaType()))
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.executeWithResponse(builder.build(), UpdateProfile_Response.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }
}
