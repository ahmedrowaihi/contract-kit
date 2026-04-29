import Foundation

public protocol UserAPI {
    /// POST /user
    func createUser(
        body: User
    ) async throws -> User

    /// POST /user/createWithList
    func createUsersWithListInput(
        body: [User]
    ) async throws -> User

    /// GET /user/login
    func loginUser(
        username: String? = nil,
        password: String? = nil
    ) async throws -> String

    /// GET /user/logout
    func logoutUser() async throws

    /// GET /user/{username}
    func getUserByName(
        username: String
    ) async throws -> User

    /// PUT /user/{username}
    func updateUser(
        username: String,
        body: User
    ) async throws

    /// DELETE /user/{username}
    func deleteUser(
        username: String
    ) async throws

    /// POST /profile
    func updateProfile(
        body: UpdateProfile_Body
    ) async throws -> UpdateProfile_Response
}
