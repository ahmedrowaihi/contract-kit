import Foundation

public final class URLSessionUserAPI: UserAPI {
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

    /// POST /user
    public func createUser(
        body: User
    ) async throws -> User {
        let url = baseURL.appendingPathComponent("user")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(body)
        let (data, _) = try await session.data(for: request)
        return try decoder.decode(User.self, from: data)
    }

    /// POST /user/createWithList
    public func createUsersWithListInput(
        body: [User]
    ) async throws -> User {
        let url = baseURL.appendingPathComponent("user/createWithList")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(body)
        let (data, _) = try await session.data(for: request)
        return try decoder.decode(User.self, from: data)
    }

    /// GET /user/login
    public func loginUser(
        username: String? = nil,
        password: String? = nil
    ) async throws -> String {
        var components = URLComponents(url: baseURL.appendingPathComponent("user/login"), resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem]()
        if let username = username {
            components.queryItems!.append(URLQueryItem(name: "username", value: "\(username)"))
        }
        if let password = password {
            components.queryItems!.append(URLQueryItem(name: "password", value: "\(password)"))
        }
        let url = components.url!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        let (data, _) = try await session.data(for: request)
        return try decoder.decode(String.self, from: data)
    }

    /// GET /user/logout
    public func logoutUser() async throws {
        let url = baseURL.appendingPathComponent("user/logout")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        let (data, _) = try await session.data(for: request)
    }

    /// GET /user/{username}
    public func getUserByName(
        username: String
    ) async throws -> User {
        let url = baseURL.appendingPathComponent("user/\(username)")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        let (data, _) = try await session.data(for: request)
        return try decoder.decode(User.self, from: data)
    }

    /// PUT /user/{username}
    public func updateUser(
        username: String,
        body: User
    ) async throws {
        let url = baseURL.appendingPathComponent("user/\(username)")
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(body)
        let (data, _) = try await session.data(for: request)
    }

    /// DELETE /user/{username}
    public func deleteUser(
        username: String
    ) async throws {
        let url = baseURL.appendingPathComponent("user/\(username)")
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        let (data, _) = try await session.data(for: request)
    }

    /// POST /profile
    public func updateProfile(
        body: UpdateProfile_Body
    ) async throws -> UpdateProfile_Response {
        let url = baseURL.appendingPathComponent("profile")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(body)
        let (data, _) = try await session.data(for: request)
        return try decoder.decode(UpdateProfile_Response.self, from: data)
    }
}
