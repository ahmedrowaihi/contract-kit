import Foundation

public final class URLSessionUserAPI: UserAPI {
    let client: APIClient

    public init(
        client: APIClient
    ) {
        self.client = client
    }

    /// POST /user
    public func createUser(
        body: User,
        options: RequestOptions = RequestOptions()
    ) async throws -> User {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("user")
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
        return try await client.execute(request, as: User.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// POST /user
    public func createUserWithResponse(
        body: User,
        options: RequestOptions = RequestOptions()
    ) async throws -> (User, HTTPURLResponse) {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("user")
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
        return try await client.executeWithResponse(request, as: User.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// POST /user/createWithList
    public func createUsersWithListInput(
        body: [User],
        options: RequestOptions = RequestOptions()
    ) async throws -> User {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("user").appendingPathComponent("createWithList")
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
        return try await client.execute(request, as: User.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// POST /user/createWithList
    public func createUsersWithListInputWithResponse(
        body: [User],
        options: RequestOptions = RequestOptions()
    ) async throws -> (User, HTTPURLResponse) {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("user").appendingPathComponent("createWithList")
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
        return try await client.executeWithResponse(request, as: User.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// GET /user/login
    public func loginUser(
        username: String? = nil,
        password: String? = nil,
        options: RequestOptions = RequestOptions()
    ) async throws -> String {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        guard let urlComponents = URLComponents(url: baseURL.appendingPathComponent("user").appendingPathComponent("login"), resolvingAgainstBaseURL: false) else {
            throw APIError.transport(URLError(.badURL))
        }
        var components = urlComponents
        components.queryItems = [URLQueryItem]()
        components.queryItems?.append(contentsOf: URLEncoding.query("username", value: username))
        components.queryItems?.append(contentsOf: URLEncoding.query("password", value: password))
        guard let url = components.url else {
            throw APIError.transport(URLError(.badURL))
        }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.execute(request, as: String.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// GET /user/login
    public func loginUserWithResponse(
        username: String? = nil,
        password: String? = nil,
        options: RequestOptions = RequestOptions()
    ) async throws -> (String, HTTPURLResponse) {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        guard let urlComponents = URLComponents(url: baseURL.appendingPathComponent("user").appendingPathComponent("login"), resolvingAgainstBaseURL: false) else {
            throw APIError.transport(URLError(.badURL))
        }
        var components = urlComponents
        components.queryItems = [URLQueryItem]()
        components.queryItems?.append(contentsOf: URLEncoding.query("username", value: username))
        components.queryItems?.append(contentsOf: URLEncoding.query("password", value: password))
        guard let url = components.url else {
            throw APIError.transport(URLError(.badURL))
        }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.executeWithResponse(request, as: String.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// GET /user/logout
    public func logoutUser(
        options: RequestOptions = RequestOptions()
    ) async throws {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("user").appendingPathComponent("logout")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        try await client.execute(request, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator)
    }

    /// GET /user/logout
    public func logoutUserWithResponse(
        options: RequestOptions = RequestOptions()
    ) async throws -> HTTPURLResponse {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("user").appendingPathComponent("logout")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.executeWithResponse(request, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator)
    }

    /// GET /user/{username}
    public func getUserByName(
        username: String,
        options: RequestOptions = RequestOptions()
    ) async throws -> User {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("user").appendingPathComponent("\(username)")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.execute(request, as: User.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// GET /user/{username}
    public func getUserByNameWithResponse(
        username: String,
        options: RequestOptions = RequestOptions()
    ) async throws -> (User, HTTPURLResponse) {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("user").appendingPathComponent("\(username)")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.executeWithResponse(request, as: User.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// PUT /user/{username}
    public func updateUser(
        username: String,
        body: User,
        options: RequestOptions = RequestOptions()
    ) async throws {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("user").appendingPathComponent("\(username)")
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try client.encoder.encode(body)
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        try await client.execute(request, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator)
    }

    /// PUT /user/{username}
    public func updateUserWithResponse(
        username: String,
        body: User,
        options: RequestOptions = RequestOptions()
    ) async throws -> HTTPURLResponse {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("user").appendingPathComponent("\(username)")
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try client.encoder.encode(body)
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.executeWithResponse(request, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator)
    }

    /// DELETE /user/{username}
    public func deleteUser(
        username: String,
        options: RequestOptions = RequestOptions()
    ) async throws {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("user").appendingPathComponent("\(username)")
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        try await client.execute(request, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator)
    }

    /// DELETE /user/{username}
    public func deleteUserWithResponse(
        username: String,
        options: RequestOptions = RequestOptions()
    ) async throws -> HTTPURLResponse {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("user").appendingPathComponent("\(username)")
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.executeWithResponse(request, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator)
    }

    /// POST /profile
    public func updateProfile(
        body: UpdateProfile_Body,
        options: RequestOptions = RequestOptions()
    ) async throws -> UpdateProfile_Response {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("profile")
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
        return try await client.execute(request, as: UpdateProfile_Response.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// POST /profile
    public func updateProfileWithResponse(
        body: UpdateProfile_Body,
        options: RequestOptions = RequestOptions()
    ) async throws -> (UpdateProfile_Response, HTTPURLResponse) {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("profile")
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
        return try await client.executeWithResponse(request, as: UpdateProfile_Response.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }
}
