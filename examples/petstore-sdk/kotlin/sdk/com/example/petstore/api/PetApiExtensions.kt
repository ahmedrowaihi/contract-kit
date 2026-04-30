package com.example.petstore.api

import com.example.petstore.models.*
import okhttp3.Response

/** POST /pet */
public suspend fun PetApi.addPet(
    body: Pet
): Pet {
    return this.addPet(body = body, options = RequestOptions())
}

/** POST /pet */
public suspend fun PetApi.addPetWithResponse(
    body: Pet
): Pair<Pet, Response> {
    return this.addPetWithResponse(body = body, options = RequestOptions())
}

/** PUT /pet */
public suspend fun PetApi.updatePet(
    body: Pet
): Pet {
    return this.updatePet(body = body, options = RequestOptions())
}

/** PUT /pet */
public suspend fun PetApi.updatePetWithResponse(
    body: Pet
): Pair<Pet, Response> {
    return this.updatePetWithResponse(body = body, options = RequestOptions())
}

/** GET /pet/findByStatus */
public suspend fun PetApi.findPetsByStatus(
    status: FindPetsByStatus_Param_Status
): List<Pet> {
    return this.findPetsByStatus(status = status, options = RequestOptions())
}

/** GET /pet/findByStatus */
public suspend fun PetApi.findPetsByStatusWithResponse(
    status: FindPetsByStatus_Param_Status
): Pair<List<Pet>, Response> {
    return this.findPetsByStatusWithResponse(status = status, options = RequestOptions())
}

/** GET /pet/findByTags */
public suspend fun PetApi.findPetsByTags(
    tags: List<String>
): List<Pet> {
    return this.findPetsByTags(tags = tags, options = RequestOptions())
}

/** GET /pet/findByTags */
public suspend fun PetApi.findPetsByTagsWithResponse(
    tags: List<String>
): Pair<List<Pet>, Response> {
    return this.findPetsByTagsWithResponse(tags = tags, options = RequestOptions())
}

/** GET /pet/{petId} */
public suspend fun PetApi.getPetById(
    petId: Long
): Pet {
    return this.getPetById(petId = petId, options = RequestOptions())
}

/** GET /pet/{petId} */
public suspend fun PetApi.getPetByIdWithResponse(
    petId: Long
): Pair<Pet, Response> {
    return this.getPetByIdWithResponse(petId = petId, options = RequestOptions())
}

/** POST /pet/{petId} */
public suspend fun PetApi.updatePetWithForm(
    petId: Long,
    name: String?,
    status: String?
): Pet {
    return this.updatePetWithForm(petId = petId, name = name, status = status, options = RequestOptions())
}

/** POST /pet/{petId} */
public suspend fun PetApi.updatePetWithFormWithResponse(
    petId: Long,
    name: String?,
    status: String?
): Pair<Pet, Response> {
    return this.updatePetWithFormWithResponse(petId = petId, name = name, status = status, options = RequestOptions())
}

/** DELETE /pet/{petId} */
public suspend fun PetApi.deletePet(
    petId: Long,
    apiKey: String?
) {
    this.deletePet(petId = petId, apiKey = apiKey, options = RequestOptions())
}

/** DELETE /pet/{petId} */
public suspend fun PetApi.deletePetWithResponse(
    petId: Long,
    apiKey: String?
): Response {
    return this.deletePetWithResponse(petId = petId, apiKey = apiKey, options = RequestOptions())
}

/** POST /pet/{petId}/uploadImage */
public suspend fun PetApi.uploadFile(
    petId: Long,
    additionalMetadata: String?,
    body: ByteArray
): ApiResponse {
    return this.uploadFile(petId = petId, additionalMetadata = additionalMetadata, body = body, options = RequestOptions())
}

/** POST /pet/{petId}/uploadImage */
public suspend fun PetApi.uploadFileWithResponse(
    petId: Long,
    additionalMetadata: String?,
    body: ByteArray
): Pair<ApiResponse, Response> {
    return this.uploadFileWithResponse(petId = petId, additionalMetadata = additionalMetadata, body = body, options = RequestOptions())
}

/** POST /pet/{petId}/uploadDocument */
public suspend fun PetApi.uploadPetDocument(
    petId: Long,
    file: ByteArray,
    title: String?,
    description: String?
): ApiResponse {
    return this.uploadPetDocument(petId = petId, file = file, title = title, description = description, options = RequestOptions())
}

/** POST /pet/{petId}/uploadDocument */
public suspend fun PetApi.uploadPetDocumentWithResponse(
    petId: Long,
    file: ByteArray,
    title: String?,
    description: String?
): Pair<ApiResponse, Response> {
    return this.uploadPetDocumentWithResponse(petId = petId, file = file, title = title, description = description, options = RequestOptions())
}

/** POST /tags */
public suspend fun PetApi.submitTags(
    body: SubmitTags_Body
): SubmitTags_Response {
    return this.submitTags(body = body, options = RequestOptions())
}

/** POST /tags */
public suspend fun PetApi.submitTagsWithResponse(
    body: SubmitTags_Body
): Pair<SubmitTags_Response, Response> {
    return this.submitTagsWithResponse(body = body, options = RequestOptions())
}
