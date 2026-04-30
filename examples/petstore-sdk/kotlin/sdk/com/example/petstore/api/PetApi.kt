package com.example.petstore.api

import com.example.petstore.models.*
import okhttp3.Response

public interface PetApi {
    /** POST /pet */
    suspend fun addPet(
        body: Pet,
        options: RequestOptions
    ): Pet

    /** POST /pet */
    suspend fun addPetWithResponse(
        body: Pet,
        options: RequestOptions
    ): Pair<Pet, Response>

    /** PUT /pet */
    suspend fun updatePet(
        body: Pet,
        options: RequestOptions
    ): Pet

    /** PUT /pet */
    suspend fun updatePetWithResponse(
        body: Pet,
        options: RequestOptions
    ): Pair<Pet, Response>

    /** GET /pet/findByStatus */
    suspend fun findPetsByStatus(
        status: FindPetsByStatus_Param_Status,
        options: RequestOptions
    ): List<Pet>

    /** GET /pet/findByStatus */
    suspend fun findPetsByStatusWithResponse(
        status: FindPetsByStatus_Param_Status,
        options: RequestOptions
    ): Pair<List<Pet>, Response>

    /** GET /pet/findByTags */
    suspend fun findPetsByTags(
        tags: List<String>,
        options: RequestOptions
    ): List<Pet>

    /** GET /pet/findByTags */
    suspend fun findPetsByTagsWithResponse(
        tags: List<String>,
        options: RequestOptions
    ): Pair<List<Pet>, Response>

    /** GET /pet/{petId} */
    suspend fun getPetById(
        petId: Long,
        options: RequestOptions
    ): Pet

    /** GET /pet/{petId} */
    suspend fun getPetByIdWithResponse(
        petId: Long,
        options: RequestOptions
    ): Pair<Pet, Response>

    /** POST /pet/{petId} */
    suspend fun updatePetWithForm(
        petId: Long,
        name: String?,
        status: String?,
        options: RequestOptions
    ): Pet

    /** POST /pet/{petId} */
    suspend fun updatePetWithFormWithResponse(
        petId: Long,
        name: String?,
        status: String?,
        options: RequestOptions
    ): Pair<Pet, Response>

    /** DELETE /pet/{petId} */
    suspend fun deletePet(
        petId: Long,
        apiKey: String?,
        options: RequestOptions
    )

    /** DELETE /pet/{petId} */
    suspend fun deletePetWithResponse(
        petId: Long,
        apiKey: String?,
        options: RequestOptions
    ): Response

    /** POST /pet/{petId}/uploadImage */
    suspend fun uploadFile(
        petId: Long,
        additionalMetadata: String?,
        body: ByteArray,
        options: RequestOptions
    ): ApiResponse

    /** POST /pet/{petId}/uploadImage */
    suspend fun uploadFileWithResponse(
        petId: Long,
        additionalMetadata: String?,
        body: ByteArray,
        options: RequestOptions
    ): Pair<ApiResponse, Response>

    /** POST /pet/{petId}/uploadDocument */
    suspend fun uploadPetDocument(
        petId: Long,
        file: ByteArray,
        title: String?,
        description: String?,
        options: RequestOptions
    ): ApiResponse

    /** POST /pet/{petId}/uploadDocument */
    suspend fun uploadPetDocumentWithResponse(
        petId: Long,
        file: ByteArray,
        title: String?,
        description: String?,
        options: RequestOptions
    ): Pair<ApiResponse, Response>

    /** POST /tags */
    suspend fun submitTags(
        body: SubmitTags_Body,
        options: RequestOptions
    ): SubmitTags_Response

    /** POST /tags */
    suspend fun submitTagsWithResponse(
        body: SubmitTags_Body,
        options: RequestOptions
    ): Pair<SubmitTags_Response, Response>
}
