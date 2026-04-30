package com.example.petstore

import com.example.petstore.model.ApiResponse
import com.example.petstore.model.FindPetsByStatus_Param_Status
import com.example.petstore.model.Pet
import com.example.petstore.model.SubmitTags_Body
import com.example.petstore.model.SubmitTags_Response
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query

interface PetApi {
    @POST("pet")
    suspend fun addPet(
        @Body body: Pet,
    ): Pet

    @PUT("pet")
    suspend fun updatePet(
        @Body body: Pet,
    ): Pet

    @GET("pet/findByStatus")
    suspend fun findPetsByStatus(
        @Query("status") status: FindPetsByStatus_Param_Status,
    ): List<Pet>

    @GET("pet/findByTags")
    suspend fun findPetsByTags(
        @Query("tags") tags: List<String>,
    ): List<Pet>

    @GET("pet/{petId}")
    suspend fun getPetById(
        @Path("petId") petId: Long,
    ): Pet

    @POST("pet/{petId}")
    suspend fun updatePetWithForm(
        @Path("petId") petId: Long,
        @Query("name") name: String? = null,
        @Query("status") status: String? = null,
    ): Pet

    @DELETE("pet/{petId}")
    suspend fun deletePet(
        @Path("petId") petId: Long,
        @Header("api_key") apiKey: String? = null,
    )

    @POST("pet/{petId}/uploadImage")
    suspend fun uploadFile(
        @Path("petId") petId: Long,
        @Query("additionalMetadata") additionalMetadata: String? = null,
        @Body body: RequestBody,
    ): ApiResponse

    @POST("pet/{petId}/uploadDocument")
    @Multipart
    suspend fun uploadPetDocument(
        @Path("petId") petId: Long,
        @Part("file") file: MultipartBody.Part,
        @Part("title") title: String? = null,
        @Part("description") description: String? = null,
    ): ApiResponse

    @POST("tags")
    suspend fun submitTags(
        @Body body: SubmitTags_Body,
    ): SubmitTags_Response
}
