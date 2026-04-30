import Foundation

public protocol UserAPI {
    /// POST /user
    func createUser(
        body: User,
        options: RequestOptions
    ) async throws -> User

    /// POST /user
    func createUserWithResponse(
        body: User,
        options: RequestOptions
    ) async throws -> (User, HTTPURLResponse)

    /// POST /user/createWithList
    func createUsersWithListInput(
        body: [User],
        options: RequestOptions
    ) async throws -> User

    /// POST /user/createWithList
    func createUsersWithListInputWithResponse(
        body: [User],
        options: RequestOptions
    ) async throws -> (User, HTTPURLResponse)

    /// GET /user/login
    func loginUser(
        username: String?,
        password: String?,
        options: RequestOptions
    ) async throws -> String

    /// GET /user/login
    func loginUserWithResponse(
        username: String?,
        password: String?,
        options: RequestOptions
    ) async throws -> (String, HTTPURLResponse)

    /// GET /user/logout
    func logoutUser(
        options: RequestOptions
    ) async throws

    /// GET /user/logout
    func logoutUserWithResponse(
        options: RequestOptions
    ) async throws -> HTTPURLResponse

    /// GET /user/{username}
    func getUserByName(
        username: String,
        options: RequestOptions
    ) async throws -> User

    /// GET /user/{username}
    func getUserByNameWithResponse(
        username: String,
        options: RequestOptions
    ) async throws -> (User, HTTPURLResponse)

    /// PUT /user/{username}
    func updateUser(
        username: String,
        body: User,
        options: RequestOptions
    ) async throws

    /// PUT /user/{username}
    func updateUserWithResponse(
        username: String,
        body: User,
        options: RequestOptions
    ) async throws -> HTTPURLResponse

    /// DELETE /user/{username}
    func deleteUser(
        username: String,
        options: RequestOptions
    ) async throws

    /// DELETE /user/{username}
    func deleteUserWithResponse(
        username: String,
        options: RequestOptions
    ) async throws -> HTTPURLResponse

    /// POST /profile
    func updateProfile(
        body: UpdateProfile_Body,
        options: RequestOptions
    ) async throws -> UpdateProfile_Response

    /// POST /profile
    func updateProfileWithResponse(
        body: UpdateProfile_Body,
        options: RequestOptions
    ) async throws -> (UpdateProfile_Response, HTTPURLResponse)
}
