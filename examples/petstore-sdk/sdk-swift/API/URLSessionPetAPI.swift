import Foundation

public final class URLSessionPetAPI: PetAPI {
    let baseURL: URL
    let session: URLSession
    let decoder: JSONDecoder
    let encoder: JSONEncoder

    public init(
        baseURL: URL,
        session: URLSession = .shared,
        decoder: JSONDecoder = JSONDecoder(),
        encoder: JSONEncoder = JSONEncoder()
    ) {
        self.baseURL = baseURL
        self.session = session
        self.decoder = decoder
        self.encoder = encoder
    }

    /// POST /pet
    public func addPet(
        body: Pet
    ) async throws -> Pet {
        let url = baseURL.appendingPathComponent("pet")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(body)
        let (data, _) = try await session.data(for: request)
        return try decoder.decode(Pet.self, from: data)
    }

    /// PUT /pet
    public func updatePet(
        body: Pet
    ) async throws -> Pet {
        let url = baseURL.appendingPathComponent("pet")
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(body)
        let (data, _) = try await session.data(for: request)
        return try decoder.decode(Pet.self, from: data)
    }

    /// GET /pet/findByStatus
    public func findPetsByStatus(
        status: FindPetsByStatus_Param_Status
    ) async throws -> [Pet] {
        var components = URLComponents(url: baseURL.appendingPathComponent("pet/findByStatus"), resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem]()
        components.queryItems!.append(URLQueryItem(name: "status", value: "\(status)"))
        let url = components.url!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        let (data, _) = try await session.data(for: request)
        return try decoder.decode([Pet].self, from: data)
    }

    /// GET /pet/findByTags
    public func findPetsByTags(
        tags: [String]
    ) async throws -> [Pet] {
        var components = URLComponents(url: baseURL.appendingPathComponent("pet/findByTags"), resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem]()
        components.queryItems!.append(URLQueryItem(name: "tags", value: "\(tags)"))
        let url = components.url!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        let (data, _) = try await session.data(for: request)
        return try decoder.decode([Pet].self, from: data)
    }

    /// GET /pet/{petId}
    public func getPetById(
        petId: Int64
    ) async throws -> Pet {
        let url = baseURL.appendingPathComponent("pet/\(petId)")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        let (data, _) = try await session.data(for: request)
        return try decoder.decode(Pet.self, from: data)
    }

    /// POST /pet/{petId}
    public func updatePetWithForm(
        petId: Int64,
        name: String? = nil,
        status: String? = nil
    ) async throws -> Pet {
        var components = URLComponents(url: baseURL.appendingPathComponent("pet/\(petId)"), resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem]()
        if let name = name {
            components.queryItems!.append(URLQueryItem(name: "name", value: "\(name)"))
        }
        if let status = status {
            components.queryItems!.append(URLQueryItem(name: "status", value: "\(status)"))
        }
        let url = components.url!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        let (data, _) = try await session.data(for: request)
        return try decoder.decode(Pet.self, from: data)
    }

    /// DELETE /pet/{petId}
    public func deletePet(
        petId: Int64,
        apiKey: String? = nil
    ) async throws {
        let url = baseURL.appendingPathComponent("pet/\(petId)")
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        if let apiKey = apiKey {
            request.setValue("\(apiKey)", forHTTPHeaderField: "api_key")
        }
        let (data, _) = try await session.data(for: request)
    }

    /// POST /pet/{petId}/uploadImage
    public func uploadFile(
        petId: Int64,
        additionalMetadata: String? = nil,
        body: Data
    ) async throws -> ApiResponse {
        var components = URLComponents(url: baseURL.appendingPathComponent("pet/\(petId)/uploadImage"), resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem]()
        if let additionalMetadata = additionalMetadata {
            components.queryItems!.append(URLQueryItem(name: "additionalMetadata", value: "\(additionalMetadata)"))
        }
        let url = components.url!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/octet-stream", forHTTPHeaderField: "Content-Type")
        request.httpBody = body
        let (data, _) = try await session.data(for: request)
        return try decoder.decode(ApiResponse.self, from: data)
    }

    /// POST /pet/{petId}/uploadDocument
    public func uploadPetDocument(
        petId: Int64,
        file: Data,
        title: String? = nil,
        description: String? = nil
    ) async throws -> ApiResponse {
        let url = baseURL.appendingPathComponent("pet/\(petId)/uploadDocument")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        throw URLSessionAPIError.unimplementedBody(mediaType: "multipart/form-data")
    }

    /// POST /tags
    public func submitTags(
        body: SubmitTags_Body
    ) async throws -> SubmitTags_Response {
        let url = baseURL.appendingPathComponent("tags")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(body)
        let (data, _) = try await session.data(for: request)
        return try decoder.decode(SubmitTags_Response.self, from: data)
    }
}
