import Foundation

public protocol PetAPI {
    /// POST /pet
    func addPet(
        body: Pet
    ) async throws -> Pet

    /// PUT /pet
    func updatePet(
        body: Pet
    ) async throws -> Pet

    /// GET /pet/findByStatus
    func findPetsByStatus(
        status: FindPetsByStatus_Param_Status
    ) async throws -> [Pet]

    /// GET /pet/findByTags
    func findPetsByTags(
        tags: [String]
    ) async throws -> [Pet]

    /// GET /pet/{petId}
    func getPetById(
        petId: Int64
    ) async throws -> Pet

    /// POST /pet/{petId}
    func updatePetWithForm(
        petId: Int64,
        name: String? = nil,
        status: String? = nil
    ) async throws -> Pet

    /// DELETE /pet/{petId}
    func deletePet(
        petId: Int64,
        apiKey: String? = nil
    ) async throws

    /// POST /pet/{petId}/uploadImage
    func uploadFile(
        petId: Int64,
        additionalMetadata: String? = nil,
        body: Data
    ) async throws -> ApiResponse

    /// POST /pet/{petId}/uploadDocument
    func uploadPetDocument(
        petId: Int64,
        file: Data,
        title: String? = nil,
        description: String? = nil
    ) async throws -> ApiResponse

    /// POST /tags
    func submitTags(
        body: SubmitTags_Body
    ) async throws -> SubmitTags_Response
}
