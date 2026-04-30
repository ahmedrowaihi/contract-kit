package com.example.petstore.api

import com.example.petstore.models.*
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.serializer
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response

public class OkHttpPetApi(
    public val client: APIClient,
) : PetApi {
    /** POST /pet */
    public override suspend fun addPet(
        body: Pet,
        options: RequestOptions
    ): Pet {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("pet")
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("POST", null)
        val payload = client.json.encodeToString(Pet.serializer(), body)
        builder.method("POST", payload.toRequestBody("application/json".toMediaType()))
        var currentUrl = url
        for (schemeName in listOf("petstore_auth")) {
            client.auth[schemeName]?.let { auth -> currentUrl = auth.apply(builder, currentUrl) }
        }
        builder.url(currentUrl)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.execute(builder.build(), Pet.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** POST /pet */
    public override suspend fun addPetWithResponse(
        body: Pet,
        options: RequestOptions
    ): Pair<Pet, Response> {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("pet")
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("POST", null)
        val payload = client.json.encodeToString(Pet.serializer(), body)
        builder.method("POST", payload.toRequestBody("application/json".toMediaType()))
        var currentUrl = url
        for (schemeName in listOf("petstore_auth")) {
            client.auth[schemeName]?.let { auth -> currentUrl = auth.apply(builder, currentUrl) }
        }
        builder.url(currentUrl)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.executeWithResponse(builder.build(), Pet.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** PUT /pet */
    public override suspend fun updatePet(
        body: Pet,
        options: RequestOptions
    ): Pet {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("pet")
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("PUT", null)
        val payload = client.json.encodeToString(Pet.serializer(), body)
        builder.method("PUT", payload.toRequestBody("application/json".toMediaType()))
        var currentUrl = url
        for (schemeName in listOf("petstore_auth")) {
            client.auth[schemeName]?.let { auth -> currentUrl = auth.apply(builder, currentUrl) }
        }
        builder.url(currentUrl)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.execute(builder.build(), Pet.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** PUT /pet */
    public override suspend fun updatePetWithResponse(
        body: Pet,
        options: RequestOptions
    ): Pair<Pet, Response> {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("pet")
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("PUT", null)
        val payload = client.json.encodeToString(Pet.serializer(), body)
        builder.method("PUT", payload.toRequestBody("application/json".toMediaType()))
        var currentUrl = url
        for (schemeName in listOf("petstore_auth")) {
            client.auth[schemeName]?.let { auth -> currentUrl = auth.apply(builder, currentUrl) }
        }
        builder.url(currentUrl)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.executeWithResponse(builder.build(), Pet.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** GET /pet/findByStatus */
    public override suspend fun findPetsByStatus(
        status: FindPetsByStatus_Param_Status,
        options: RequestOptions
    ): List<Pet> {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("pet")
        urlBuilder.addPathSegment("findByStatus")
        URLEncoding.addScalar(urlBuilder, "status", status)
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("GET", null)
        var currentUrl = url
        for (schemeName in listOf("petstore_auth")) {
            client.auth[schemeName]?.let { auth -> currentUrl = auth.apply(builder, currentUrl) }
        }
        builder.url(currentUrl)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.execute(builder.build(), ListSerializer(Pet.serializer()), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** GET /pet/findByStatus */
    public override suspend fun findPetsByStatusWithResponse(
        status: FindPetsByStatus_Param_Status,
        options: RequestOptions
    ): Pair<List<Pet>, Response> {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("pet")
        urlBuilder.addPathSegment("findByStatus")
        URLEncoding.addScalar(urlBuilder, "status", status)
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("GET", null)
        var currentUrl = url
        for (schemeName in listOf("petstore_auth")) {
            client.auth[schemeName]?.let { auth -> currentUrl = auth.apply(builder, currentUrl) }
        }
        builder.url(currentUrl)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.executeWithResponse(builder.build(), ListSerializer(Pet.serializer()), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** GET /pet/findByTags */
    public override suspend fun findPetsByTags(
        tags: List<String>,
        options: RequestOptions
    ): List<Pet> {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("pet")
        urlBuilder.addPathSegment("findByTags")
        URLEncoding.addArray(urlBuilder, "tags", tags, style = QueryStyle.FORM, explode = true)
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("GET", null)
        var currentUrl = url
        for (schemeName in listOf("petstore_auth")) {
            client.auth[schemeName]?.let { auth -> currentUrl = auth.apply(builder, currentUrl) }
        }
        builder.url(currentUrl)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.execute(builder.build(), ListSerializer(Pet.serializer()), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** GET /pet/findByTags */
    public override suspend fun findPetsByTagsWithResponse(
        tags: List<String>,
        options: RequestOptions
    ): Pair<List<Pet>, Response> {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("pet")
        urlBuilder.addPathSegment("findByTags")
        URLEncoding.addArray(urlBuilder, "tags", tags, style = QueryStyle.FORM, explode = true)
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("GET", null)
        var currentUrl = url
        for (schemeName in listOf("petstore_auth")) {
            client.auth[schemeName]?.let { auth -> currentUrl = auth.apply(builder, currentUrl) }
        }
        builder.url(currentUrl)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.executeWithResponse(builder.build(), ListSerializer(Pet.serializer()), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** GET /pet/{petId} */
    public override suspend fun getPetById(
        petId: Long,
        options: RequestOptions
    ): Pet {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("pet")
        urlBuilder.addPathSegment(petId.toString())
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("GET", null)
        var currentUrl = url
        for (schemeName in listOf("api_key", "petstore_auth")) {
            client.auth[schemeName]?.let { auth -> currentUrl = auth.apply(builder, currentUrl) }
        }
        builder.url(currentUrl)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.execute(builder.build(), Pet.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** GET /pet/{petId} */
    public override suspend fun getPetByIdWithResponse(
        petId: Long,
        options: RequestOptions
    ): Pair<Pet, Response> {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("pet")
        urlBuilder.addPathSegment(petId.toString())
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("GET", null)
        var currentUrl = url
        for (schemeName in listOf("api_key", "petstore_auth")) {
            client.auth[schemeName]?.let { auth -> currentUrl = auth.apply(builder, currentUrl) }
        }
        builder.url(currentUrl)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.executeWithResponse(builder.build(), Pet.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** POST /pet/{petId} */
    public override suspend fun updatePetWithForm(
        petId: Long,
        name: String?,
        status: String?,
        options: RequestOptions
    ): Pet {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("pet")
        urlBuilder.addPathSegment(petId.toString())
        URLEncoding.addScalar(urlBuilder, "name", name)
        URLEncoding.addScalar(urlBuilder, "status", status)
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("POST", null)
        var currentUrl = url
        for (schemeName in listOf("petstore_auth")) {
            client.auth[schemeName]?.let { auth -> currentUrl = auth.apply(builder, currentUrl) }
        }
        builder.url(currentUrl)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.execute(builder.build(), Pet.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** POST /pet/{petId} */
    public override suspend fun updatePetWithFormWithResponse(
        petId: Long,
        name: String?,
        status: String?,
        options: RequestOptions
    ): Pair<Pet, Response> {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("pet")
        urlBuilder.addPathSegment(petId.toString())
        URLEncoding.addScalar(urlBuilder, "name", name)
        URLEncoding.addScalar(urlBuilder, "status", status)
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("POST", null)
        var currentUrl = url
        for (schemeName in listOf("petstore_auth")) {
            client.auth[schemeName]?.let { auth -> currentUrl = auth.apply(builder, currentUrl) }
        }
        builder.url(currentUrl)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.executeWithResponse(builder.build(), Pet.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** DELETE /pet/{petId} */
    public override suspend fun deletePet(
        petId: Long,
        apiKey: String?,
        options: RequestOptions
    ) {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("pet")
        urlBuilder.addPathSegment(petId.toString())
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("DELETE", null)
        if (apiKey != null) {
            builder.header("api_key", "$apiKey")
        }
        var currentUrl = url
        for (schemeName in listOf("petstore_auth")) {
            client.auth[schemeName]?.let { auth -> currentUrl = auth.apply(builder, currentUrl) }
        }
        builder.url(currentUrl)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        client.executeUnit(builder.build(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator)
    }

    /** DELETE /pet/{petId} */
    public override suspend fun deletePetWithResponse(
        petId: Long,
        apiKey: String?,
        options: RequestOptions
    ): Response {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("pet")
        urlBuilder.addPathSegment(petId.toString())
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("DELETE", null)
        if (apiKey != null) {
            builder.header("api_key", "$apiKey")
        }
        var currentUrl = url
        for (schemeName in listOf("petstore_auth")) {
            client.auth[schemeName]?.let { auth -> currentUrl = auth.apply(builder, currentUrl) }
        }
        builder.url(currentUrl)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.executeUnitWithResponse(builder.build(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator)
    }

    /** POST /pet/{petId}/uploadImage */
    public override suspend fun uploadFile(
        petId: Long,
        additionalMetadata: String?,
        body: ByteArray,
        options: RequestOptions
    ): ApiResponse {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("pet")
        urlBuilder.addPathSegment(petId.toString())
        urlBuilder.addPathSegment("uploadImage")
        URLEncoding.addScalar(urlBuilder, "additionalMetadata", additionalMetadata)
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("POST", null)
        builder.method("POST", body.toRequestBody("application/octet-stream".toMediaType()))
        var currentUrl = url
        for (schemeName in listOf("petstore_auth")) {
            client.auth[schemeName]?.let { auth -> currentUrl = auth.apply(builder, currentUrl) }
        }
        builder.url(currentUrl)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.execute(builder.build(), ApiResponse.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** POST /pet/{petId}/uploadImage */
    public override suspend fun uploadFileWithResponse(
        petId: Long,
        additionalMetadata: String?,
        body: ByteArray,
        options: RequestOptions
    ): Pair<ApiResponse, Response> {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("pet")
        urlBuilder.addPathSegment(petId.toString())
        urlBuilder.addPathSegment("uploadImage")
        URLEncoding.addScalar(urlBuilder, "additionalMetadata", additionalMetadata)
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("POST", null)
        builder.method("POST", body.toRequestBody("application/octet-stream".toMediaType()))
        var currentUrl = url
        for (schemeName in listOf("petstore_auth")) {
            client.auth[schemeName]?.let { auth -> currentUrl = auth.apply(builder, currentUrl) }
        }
        builder.url(currentUrl)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.executeWithResponse(builder.build(), ApiResponse.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** POST /pet/{petId}/uploadDocument */
    public override suspend fun uploadPetDocument(
        petId: Long,
        file: ByteArray,
        title: String?,
        description: String?,
        options: RequestOptions
    ): ApiResponse {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("pet")
        urlBuilder.addPathSegment(petId.toString())
        urlBuilder.addPathSegment("uploadDocument")
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("POST", null)
        val multipart = MultipartFormBody()
        multipart.appendFile("file", "file", file)
        if (title != null) {
            multipart.appendText("title", "$title")
        }
        if (description != null) {
            multipart.appendText("description", "$description")
        }
        builder.method("POST", multipart.build())
        var currentUrl = url
        for (schemeName in listOf("petstore_auth")) {
            client.auth[schemeName]?.let { auth -> currentUrl = auth.apply(builder, currentUrl) }
        }
        builder.url(currentUrl)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.execute(builder.build(), ApiResponse.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** POST /pet/{petId}/uploadDocument */
    public override suspend fun uploadPetDocumentWithResponse(
        petId: Long,
        file: ByteArray,
        title: String?,
        description: String?,
        options: RequestOptions
    ): Pair<ApiResponse, Response> {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("pet")
        urlBuilder.addPathSegment(petId.toString())
        urlBuilder.addPathSegment("uploadDocument")
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("POST", null)
        val multipart = MultipartFormBody()
        multipart.appendFile("file", "file", file)
        if (title != null) {
            multipart.appendText("title", "$title")
        }
        if (description != null) {
            multipart.appendText("description", "$description")
        }
        builder.method("POST", multipart.build())
        var currentUrl = url
        for (schemeName in listOf("petstore_auth")) {
            client.auth[schemeName]?.let { auth -> currentUrl = auth.apply(builder, currentUrl) }
        }
        builder.url(currentUrl)
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.executeWithResponse(builder.build(), ApiResponse.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** POST /tags */
    public override suspend fun submitTags(
        body: SubmitTags_Body,
        options: RequestOptions
    ): SubmitTags_Response {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("tags")
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("POST", null)
        val payload = client.json.encodeToString(SubmitTags_Body.serializer(), body)
        builder.method("POST", payload.toRequestBody("application/json".toMediaType()))
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.execute(builder.build(), SubmitTags_Response.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }

    /** POST /tags */
    public override suspend fun submitTagsWithResponse(
        body: SubmitTags_Body,
        options: RequestOptions
    ): Pair<SubmitTags_Response, Response> {
        val client = options.client ?: this.client
        val baseUrl = options.baseUrl ?: client.baseUrl
        var urlBuilder = baseUrl.newBuilder()
        urlBuilder.addPathSegment("tags")
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).method("POST", null)
        val payload = client.json.encodeToString(SubmitTags_Body.serializer(), body)
        builder.method("POST", payload.toRequestBody("application/json".toMediaType()))
        for (header in options.headers) {
            builder.header(header.key, header.value)
        }
        return client.executeWithResponse(builder.build(), SubmitTags_Response.serializer(), timeout = options.timeout, extraInterceptors = options.requestInterceptors, responseValidator = options.responseValidator, responseTransformer = options.responseTransformer)
    }
}
