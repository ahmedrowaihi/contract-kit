package com.example.petstore

import com.example.petstore.api.APIClient
import com.example.petstore.api.APIError
import com.example.petstore.api.APIKeyLocation
import com.example.petstore.api.Auth
import com.example.petstore.api.OkHttpPetApi
import com.example.petstore.api.PetApi
import com.example.petstore.api.RequestOptions
import com.example.petstore.api.getPetById
import com.example.petstore.api.getPetByIdWithResponse
import com.example.petstore.api.addPet
import com.example.petstore.api.deletePet
import com.example.petstore.api.findPetsByStatus
import com.example.petstore.api.updatePet
import com.example.petstore.api.uploadPetDocument
import com.example.petstore.models.ApiResponse
import com.example.petstore.models.FindPetsByStatus_Param_Status
import com.example.petstore.models.Pet
import com.example.petstore.models.Pet_Status
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.Response

/**
 * The single shared API client. Wire this up once at app startup; per-call
 * options on individual methods can override `client` / `baseUrl` / etc.
 */
object Api {
    val client: APIClient = APIClient(
        baseUrl = "https://petstore3.swagger.io/api/v3/".toHttpUrl(),
    )
    val pets: PetApi = OkHttpPetApi(client)
}

suspend fun create(): Pet {
    val new = Pet(
        name = "Rex",
        photoUrls = listOf(),
        status = Pet_Status.AVAILABLE,
    )
    return Api.pets.addPet(body = new)
}

suspend fun read(id: Long): Pet =
    Api.pets.getPetById(petId = id)

suspend fun update(pet: Pet): Pet =
    Api.pets.updatePet(body = pet)

suspend fun delete(id: Long) {
    Api.pets.deletePet(petId = id, apiKey = null)
}

suspend fun listAvailable(): List<Pet> =
    Api.pets.findPetsByStatus(status = FindPetsByStatus_Param_Status.AVAILABLE)

fun configureBearerAuth(token: String) {
    Api.client.auth["petstore_auth"] = Auth.Bearer(token)
}

fun configureApiKey(key: String) {
    Api.client.auth["api_key"] = Auth.ApiKey(
        name = "X-API-Key",
        value = key,
        location = APIKeyLocation.HEADER,
    )
}

suspend fun uploadDocument(petId: Long, file: ByteArray): ApiResponse =
    Api.pets.uploadPetDocument(
        petId = petId,
        file = file,
        title = null,
        description = null,
    )

suspend fun readWithErrorHandling(id: Long) {
    try {
        Api.pets.getPetById(petId = id)
    } catch (e: APIError.ClientError) {
        if (e.statusCode == 404) println("not found")
        else println("client ${e.statusCode}")
    } catch (e: APIError.Transport) {
        println("network: ${e.cause?.message}")
    }
}

suspend fun readFromStaging(id: Long): Pet =
    Api.pets.getPetById(
        petId = id,
        options = RequestOptions(
            baseUrl = "https://staging.example.com/api/v3/".toHttpUrl(),
        ),
    )

suspend fun readWithCustomHeader(id: Long, traceId: String): Pet =
    Api.pets.getPetById(
        petId = id,
        options = RequestOptions(headers = mapOf("X-Trace-Id" to traceId)),
    )

suspend fun readBypassingClientInterceptors(id: Long, rawClient: APIClient): Pet =
    Api.pets.getPetById(petId = id, options = RequestOptions(client = rawClient))

suspend fun readWithHeaders(id: Long): Pair<Pet, Map<String, List<String>>> {
    val (pet, response) = Api.pets.getPetByIdWithResponse(petId = id)
    return pet to response.headers.toMultimap()
}

suspend fun readWithTimeout(id: Long, ms: Long): Pet =
    Api.pets.getPetById(
        petId = id,
        options = RequestOptions(timeout = ms),
    )

suspend fun readUnwrappingEnvelope(id: Long): Pet {
    val unwrap: suspend (ByteArray) -> ByteArray = { data ->
        val envelope: JsonObject = Json.parseToJsonElement(data.decodeToString()).jsonObject
        Json.encodeToString(JsonObject.serializer(), envelope["data"]!!.jsonObject).toByteArray()
    }
    return Api.pets.getPetById(
        petId = id,
        options = RequestOptions(responseTransformer = unwrap),
    )
}

suspend fun readWithRuntimeValidation(id: Long): Pet {
    val validate: suspend (ByteArray, Response) -> Unit = { data, response ->
        if (data.isEmpty()) throw APIError.Transport(IllegalStateException("empty body"))
        val ct = response.header("Content-Type") ?: ""
        if (!ct.contains("json"))
            throw APIError.Transport(IllegalStateException("not JSON: $ct"))
    }
    return Api.pets.getPetById(
        petId = id,
        options = RequestOptions(responseValidator = validate),
    )
}

fun installLoggingInterceptor() {
    Api.client.interceptors.request += { request ->
        println("→ ${request.method} ${request.url}")
        request
    }
}
