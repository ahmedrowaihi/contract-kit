import Foundation

public extension UserAPI {
    /// POST /user
    func createUser(
        body: User
    ) async throws -> User {
        return try await self.createUser(body: body, options: RequestOptions())
    }

    /// POST /user
    func createUserWithResponse(
        body: User
    ) async throws -> (User, HTTPURLResponse) {
        return try await self.createUserWithResponse(body: body, options: RequestOptions())
    }

    /// POST /user/createWithList
    func createUsersWithListInput(
        body: [User]
    ) async throws -> User {
        return try await self.createUsersWithListInput(body: body, options: RequestOptions())
    }

    /// POST /user/createWithList
    func createUsersWithListInputWithResponse(
        body: [User]
    ) async throws -> (User, HTTPURLResponse) {
        return try await self.createUsersWithListInputWithResponse(body: body, options: RequestOptions())
    }

    /// GET /user/login
    func loginUser(
        username: String? = nil,
        password: String? = nil
    ) async throws -> String {
        return try await self.loginUser(username: username, password: password, options: RequestOptions())
    }

    /// GET /user/login
    func loginUserWithResponse(
        username: String? = nil,
        password: String? = nil
    ) async throws -> (String, HTTPURLResponse) {
        return try await self.loginUserWithResponse(username: username, password: password, options: RequestOptions())
    }

    /// GET /user/logout
    func logoutUser() async throws {
        try await self.logoutUser(options: RequestOptions())
    }

    /// GET /user/logout
    func logoutUserWithResponse() async throws -> HTTPURLResponse {
        return try await self.logoutUserWithResponse(options: RequestOptions())
    }

    /// GET /user/{username}
    func getUserByName(
        username: String
    ) async throws -> User {
        return try await self.getUserByName(username: username, options: RequestOptions())
    }

    /// GET /user/{username}
    func getUserByNameWithResponse(
        username: String
    ) async throws -> (User, HTTPURLResponse) {
        return try await self.getUserByNameWithResponse(username: username, options: RequestOptions())
    }

    /// PUT /user/{username}
    func updateUser(
        username: String,
        body: User
    ) async throws {
        try await self.updateUser(username: username, body: body, options: RequestOptions())
    }

    /// PUT /user/{username}
    func updateUserWithResponse(
        username: String,
        body: User
    ) async throws -> HTTPURLResponse {
        return try await self.updateUserWithResponse(username: username, body: body, options: RequestOptions())
    }

    /// DELETE /user/{username}
    func deleteUser(
        username: String
    ) async throws {
        try await self.deleteUser(username: username, options: RequestOptions())
    }

    /// DELETE /user/{username}
    func deleteUserWithResponse(
        username: String
    ) async throws -> HTTPURLResponse {
        return try await self.deleteUserWithResponse(username: username, options: RequestOptions())
    }

    /// POST /profile
    func updateProfile(
        body: UpdateProfile_Body
    ) async throws -> UpdateProfile_Response {
        return try await self.updateProfile(body: body, options: RequestOptions())
    }

    /// POST /profile
    func updateProfileWithResponse(
        body: UpdateProfile_Body
    ) async throws -> (UpdateProfile_Response, HTTPURLResponse) {
        return try await self.updateProfileWithResponse(body: body, options: RequestOptions())
    }
}
