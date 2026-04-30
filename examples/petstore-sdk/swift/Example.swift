import Foundation

enum API {
    static let client = APIClient(
        baseURL: URL(string: "https://petstore3.swagger.io/api/v3/")!
    )
    static let pets: PetAPI = URLSessionPetAPI(client: client)
}

func create() async throws -> Pet {
    let new = Pet(
        id: nil,
        name: "Rex",
        category: nil,
        photoUrls: [],
        tags: nil,
        status: .available
    )
    return try await API.pets.addPet(body: new)
}

func read(id: Int64) async throws -> Pet {
    try await API.pets.getPetById(petId: id)
}

func update(_ pet: Pet) async throws -> Pet {
    try await API.pets.updatePet(body: pet)
}

func delete(id: Int64) async throws {
    try await API.pets.deletePet(petId: id, apiKey: nil)
}

func listAvailable() async throws -> [Pet] {
    try await API.pets.findPetsByStatus(status: .available)
}

func configureAuth(token: String) {
    API.client.auth["petstore_auth"] = .bearer(token: token)
}

func uploadDocument(petId: Int64, file: Data) async throws -> ApiResponse {
    try await API.pets.uploadPetDocument(
        petId: petId, file: file, title: nil, description: nil
    )
}

func readWithErrorHandling(id: Int64) async {
    do {
        _ = try await API.pets.getPetById(petId: id)
    } catch APIError.clientError(let status, _) where status == 404 {
        print("not found")
    } catch APIError.clientError(let status, _) {
        print("client \(status)")
    } catch APIError.transport(let underlying) {
        print("network:", underlying.localizedDescription)
    } catch {
        print(error)
    }
}

func readFromStaging(id: Int64) async throws -> Pet {
    try await API.pets.getPetById(
        petId: id,
        options: .init(baseURL: URL(string: "https://staging.example.com/api/v3/")!)
    )
}

func readWithCustomHeader(id: Int64, traceId: String) async throws -> Pet {
    try await API.pets.getPetById(
        petId: id,
        options: .init(headers: ["X-Trace-Id": traceId])
    )
}

func readBypassingClientInterceptors(id: Int64, rawClient: APIClient) async throws -> Pet {
    try await API.pets.getPetById(petId: id, options: .init(client: rawClient))
}

func readWithHeaders(id: Int64) async throws -> (Pet, [AnyHashable: Any]) {
    let (pet, response) = try await API.pets.getPetByIdWithResponse(petId: id)
    return (pet, response.allHeaderFields)
}

func readWithTimeout(id: Int64, seconds: TimeInterval) async throws -> Pet {
    try await API.pets.getPetById(petId: id, options: .init(timeout: seconds))
}

struct ServerEnvelope: Decodable {
    let data: Pet
}

func readUnwrappingEnvelope(id: Int64) async throws -> Pet {
    let unwrap: (Data) async throws -> Data = { data in
        let envelope = try JSONDecoder().decode(ServerEnvelope.self, from: data)
        return try JSONEncoder().encode(envelope.data)
    }
    return try await API.pets.getPetById(
        petId: id,
        options: .init(responseTransformer: unwrap)
    )
}

func readWithRuntimeValidation(id: Int64) async throws -> Pet {
    let validate: (Data, HTTPURLResponse) async throws -> Void = { data, response in
        guard !data.isEmpty else { throw APIError.transport(URLError(.zeroByteResource)) }
        guard response.value(forHTTPHeaderField: "Content-Type")?.contains("json") == true else {
            throw APIError.transport(URLError(.cannotParseResponse))
        }
    }
    return try await API.pets.getPetById(
        petId: id,
        options: .init(responseValidator: validate)
    )
}
