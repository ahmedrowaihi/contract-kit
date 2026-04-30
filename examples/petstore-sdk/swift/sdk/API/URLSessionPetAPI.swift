import Foundation

public final class URLSessionPetAPI: PetAPI {
    let client: APIClient

    public init(
        client: APIClient
    ) {
        self.client = client
    }

    /// POST /pet
    public func addPet(
        body: Pet,
        options: RequestOptions = RequestOptions()
    ) async throws -> Pet {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("pet")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try client.encoder.encode(body)
        for schemeName in ["petstore_auth"] {
            if let auth = client.auth[schemeName] {
                request = auth.apply(to: request)
            }
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.execute(request, as: Pet.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// POST /pet
    public func addPetWithResponse(
        body: Pet,
        options: RequestOptions = RequestOptions()
    ) async throws -> (Pet, HTTPURLResponse) {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("pet")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try client.encoder.encode(body)
        for schemeName in ["petstore_auth"] {
            if let auth = client.auth[schemeName] {
                request = auth.apply(to: request)
            }
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.executeWithResponse(request, as: Pet.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// PUT /pet
    public func updatePet(
        body: Pet,
        options: RequestOptions = RequestOptions()
    ) async throws -> Pet {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("pet")
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try client.encoder.encode(body)
        for schemeName in ["petstore_auth"] {
            if let auth = client.auth[schemeName] {
                request = auth.apply(to: request)
            }
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.execute(request, as: Pet.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// PUT /pet
    public func updatePetWithResponse(
        body: Pet,
        options: RequestOptions = RequestOptions()
    ) async throws -> (Pet, HTTPURLResponse) {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("pet")
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try client.encoder.encode(body)
        for schemeName in ["petstore_auth"] {
            if let auth = client.auth[schemeName] {
                request = auth.apply(to: request)
            }
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.executeWithResponse(request, as: Pet.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// GET /pet/findByStatus
    public func findPetsByStatus(
        status: FindPetsByStatus_Param_Status,
        options: RequestOptions = RequestOptions()
    ) async throws -> [Pet] {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        guard let urlComponents = URLComponents(url: baseURL.appendingPathComponent("pet").appendingPathComponent("findByStatus"), resolvingAgainstBaseURL: false) else {
            throw APIError.transport(URLError(.badURL))
        }
        var components = urlComponents
        components.queryItems = [URLQueryItem]()
        components.queryItems?.append(contentsOf: URLEncoding.query("status", value: status))
        guard let url = components.url else {
            throw APIError.transport(URLError(.badURL))
        }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        for schemeName in ["petstore_auth"] {
            if let auth = client.auth[schemeName] {
                request = auth.apply(to: request)
            }
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.execute(request, as: [Pet].self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// GET /pet/findByStatus
    public func findPetsByStatusWithResponse(
        status: FindPetsByStatus_Param_Status,
        options: RequestOptions = RequestOptions()
    ) async throws -> ([Pet], HTTPURLResponse) {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        guard let urlComponents = URLComponents(url: baseURL.appendingPathComponent("pet").appendingPathComponent("findByStatus"), resolvingAgainstBaseURL: false) else {
            throw APIError.transport(URLError(.badURL))
        }
        var components = urlComponents
        components.queryItems = [URLQueryItem]()
        components.queryItems?.append(contentsOf: URLEncoding.query("status", value: status))
        guard let url = components.url else {
            throw APIError.transport(URLError(.badURL))
        }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        for schemeName in ["petstore_auth"] {
            if let auth = client.auth[schemeName] {
                request = auth.apply(to: request)
            }
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.executeWithResponse(request, as: [Pet].self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// GET /pet/findByTags
    public func findPetsByTags(
        tags: [String],
        options: RequestOptions = RequestOptions()
    ) async throws -> [Pet] {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        guard let urlComponents = URLComponents(url: baseURL.appendingPathComponent("pet").appendingPathComponent("findByTags"), resolvingAgainstBaseURL: false) else {
            throw APIError.transport(URLError(.badURL))
        }
        var components = urlComponents
        components.queryItems = [URLQueryItem]()
        components.queryItems?.append(contentsOf: URLEncoding.query("tags", values: tags, style: .form, explode: true))
        guard let url = components.url else {
            throw APIError.transport(URLError(.badURL))
        }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        for schemeName in ["petstore_auth"] {
            if let auth = client.auth[schemeName] {
                request = auth.apply(to: request)
            }
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.execute(request, as: [Pet].self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// GET /pet/findByTags
    public func findPetsByTagsWithResponse(
        tags: [String],
        options: RequestOptions = RequestOptions()
    ) async throws -> ([Pet], HTTPURLResponse) {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        guard let urlComponents = URLComponents(url: baseURL.appendingPathComponent("pet").appendingPathComponent("findByTags"), resolvingAgainstBaseURL: false) else {
            throw APIError.transport(URLError(.badURL))
        }
        var components = urlComponents
        components.queryItems = [URLQueryItem]()
        components.queryItems?.append(contentsOf: URLEncoding.query("tags", values: tags, style: .form, explode: true))
        guard let url = components.url else {
            throw APIError.transport(URLError(.badURL))
        }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        for schemeName in ["petstore_auth"] {
            if let auth = client.auth[schemeName] {
                request = auth.apply(to: request)
            }
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.executeWithResponse(request, as: [Pet].self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// GET /pet/{petId}
    public func getPetById(
        petId: Int64,
        options: RequestOptions = RequestOptions()
    ) async throws -> Pet {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("pet").appendingPathComponent("\(petId)")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        for schemeName in ["api_key", "petstore_auth"] {
            if let auth = client.auth[schemeName] {
                request = auth.apply(to: request)
            }
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.execute(request, as: Pet.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// GET /pet/{petId}
    public func getPetByIdWithResponse(
        petId: Int64,
        options: RequestOptions = RequestOptions()
    ) async throws -> (Pet, HTTPURLResponse) {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("pet").appendingPathComponent("\(petId)")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        for schemeName in ["api_key", "petstore_auth"] {
            if let auth = client.auth[schemeName] {
                request = auth.apply(to: request)
            }
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.executeWithResponse(request, as: Pet.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// POST /pet/{petId}
    public func updatePetWithForm(
        petId: Int64,
        name: String? = nil,
        status: String? = nil,
        options: RequestOptions = RequestOptions()
    ) async throws -> Pet {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        guard let urlComponents = URLComponents(url: baseURL.appendingPathComponent("pet").appendingPathComponent("\(petId)"), resolvingAgainstBaseURL: false) else {
            throw APIError.transport(URLError(.badURL))
        }
        var components = urlComponents
        components.queryItems = [URLQueryItem]()
        components.queryItems?.append(contentsOf: URLEncoding.query("name", value: name))
        components.queryItems?.append(contentsOf: URLEncoding.query("status", value: status))
        guard let url = components.url else {
            throw APIError.transport(URLError(.badURL))
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        for schemeName in ["petstore_auth"] {
            if let auth = client.auth[schemeName] {
                request = auth.apply(to: request)
            }
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.execute(request, as: Pet.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// POST /pet/{petId}
    public func updatePetWithFormWithResponse(
        petId: Int64,
        name: String? = nil,
        status: String? = nil,
        options: RequestOptions = RequestOptions()
    ) async throws -> (Pet, HTTPURLResponse) {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        guard let urlComponents = URLComponents(url: baseURL.appendingPathComponent("pet").appendingPathComponent("\(petId)"), resolvingAgainstBaseURL: false) else {
            throw APIError.transport(URLError(.badURL))
        }
        var components = urlComponents
        components.queryItems = [URLQueryItem]()
        components.queryItems?.append(contentsOf: URLEncoding.query("name", value: name))
        components.queryItems?.append(contentsOf: URLEncoding.query("status", value: status))
        guard let url = components.url else {
            throw APIError.transport(URLError(.badURL))
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        for schemeName in ["petstore_auth"] {
            if let auth = client.auth[schemeName] {
                request = auth.apply(to: request)
            }
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.executeWithResponse(request, as: Pet.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// DELETE /pet/{petId}
    public func deletePet(
        petId: Int64,
        apiKey: String? = nil,
        options: RequestOptions = RequestOptions()
    ) async throws {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("pet").appendingPathComponent("\(petId)")
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        if let apiKey = apiKey {
            request.setValue("\(apiKey)", forHTTPHeaderField: "api_key")
        }
        for schemeName in ["petstore_auth"] {
            if let auth = client.auth[schemeName] {
                request = auth.apply(to: request)
            }
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        try await client.execute(request, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator)
    }

    /// DELETE /pet/{petId}
    public func deletePetWithResponse(
        petId: Int64,
        apiKey: String? = nil,
        options: RequestOptions = RequestOptions()
    ) async throws -> HTTPURLResponse {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("pet").appendingPathComponent("\(petId)")
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        if let apiKey = apiKey {
            request.setValue("\(apiKey)", forHTTPHeaderField: "api_key")
        }
        for schemeName in ["petstore_auth"] {
            if let auth = client.auth[schemeName] {
                request = auth.apply(to: request)
            }
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.executeWithResponse(request, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator)
    }

    /// POST /pet/{petId}/uploadImage
    public func uploadFile(
        petId: Int64,
        additionalMetadata: String? = nil,
        body: Data,
        options: RequestOptions = RequestOptions()
    ) async throws -> ApiResponse {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        guard let urlComponents = URLComponents(url: baseURL.appendingPathComponent("pet").appendingPathComponent("\(petId)").appendingPathComponent("uploadImage"), resolvingAgainstBaseURL: false) else {
            throw APIError.transport(URLError(.badURL))
        }
        var components = urlComponents
        components.queryItems = [URLQueryItem]()
        components.queryItems?.append(contentsOf: URLEncoding.query("additionalMetadata", value: additionalMetadata))
        guard let url = components.url else {
            throw APIError.transport(URLError(.badURL))
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        request.setValue("application/octet-stream", forHTTPHeaderField: "Content-Type")
        request.httpBody = body
        for schemeName in ["petstore_auth"] {
            if let auth = client.auth[schemeName] {
                request = auth.apply(to: request)
            }
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.execute(request, as: ApiResponse.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// POST /pet/{petId}/uploadImage
    public func uploadFileWithResponse(
        petId: Int64,
        additionalMetadata: String? = nil,
        body: Data,
        options: RequestOptions = RequestOptions()
    ) async throws -> (ApiResponse, HTTPURLResponse) {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        guard let urlComponents = URLComponents(url: baseURL.appendingPathComponent("pet").appendingPathComponent("\(petId)").appendingPathComponent("uploadImage"), resolvingAgainstBaseURL: false) else {
            throw APIError.transport(URLError(.badURL))
        }
        var components = urlComponents
        components.queryItems = [URLQueryItem]()
        components.queryItems?.append(contentsOf: URLEncoding.query("additionalMetadata", value: additionalMetadata))
        guard let url = components.url else {
            throw APIError.transport(URLError(.badURL))
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        request.setValue("application/octet-stream", forHTTPHeaderField: "Content-Type")
        request.httpBody = body
        for schemeName in ["petstore_auth"] {
            if let auth = client.auth[schemeName] {
                request = auth.apply(to: request)
            }
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.executeWithResponse(request, as: ApiResponse.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// POST /pet/{petId}/uploadDocument
    public func uploadPetDocument(
        petId: Int64,
        file: Data,
        title: String? = nil,
        description: String? = nil,
        options: RequestOptions = RequestOptions()
    ) async throws -> ApiResponse {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("pet").appendingPathComponent("\(petId)").appendingPathComponent("uploadDocument")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        let multipart = MultipartFormBody()
        multipart.append(file, name: "file", filename: "file")
        if let title = title {
            multipart.append("\(title)", name: "title")
        }
        if let description = description {
            multipart.append("\(description)", name: "description")
        }
        request.setValue(multipart.contentType, forHTTPHeaderField: "Content-Type")
        request.httpBody = multipart.finalize()
        for schemeName in ["petstore_auth"] {
            if let auth = client.auth[schemeName] {
                request = auth.apply(to: request)
            }
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.execute(request, as: ApiResponse.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// POST /pet/{petId}/uploadDocument
    public func uploadPetDocumentWithResponse(
        petId: Int64,
        file: Data,
        title: String? = nil,
        description: String? = nil,
        options: RequestOptions = RequestOptions()
    ) async throws -> (ApiResponse, HTTPURLResponse) {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("pet").appendingPathComponent("\(petId)").appendingPathComponent("uploadDocument")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        let multipart = MultipartFormBody()
        multipart.append(file, name: "file", filename: "file")
        if let title = title {
            multipart.append("\(title)", name: "title")
        }
        if let description = description {
            multipart.append("\(description)", name: "description")
        }
        request.setValue(multipart.contentType, forHTTPHeaderField: "Content-Type")
        request.httpBody = multipart.finalize()
        for schemeName in ["petstore_auth"] {
            if let auth = client.auth[schemeName] {
                request = auth.apply(to: request)
            }
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.executeWithResponse(request, as: ApiResponse.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// POST /tags
    public func submitTags(
        body: SubmitTags_Body,
        options: RequestOptions = RequestOptions()
    ) async throws -> SubmitTags_Response {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("tags")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try client.encoder.encode(body)
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.execute(request, as: SubmitTags_Response.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// POST /tags
    public func submitTagsWithResponse(
        body: SubmitTags_Body,
        options: RequestOptions = RequestOptions()
    ) async throws -> (SubmitTags_Response, HTTPURLResponse) {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("tags")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try client.encoder.encode(body)
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.executeWithResponse(request, as: SubmitTags_Response.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }
}
