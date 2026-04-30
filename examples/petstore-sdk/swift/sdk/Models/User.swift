import Foundation

public struct User: Codable {
    public let id: Int64?
    public let username: String?
    public let firstName: String?
    public let lastName: String?
    public let email: String?
    public let password: String?
    public let phone: String?
    public let userStatus: Int32?

    public init(
        id: Int64? = nil,
        username: String? = nil,
        firstName: String? = nil,
        lastName: String? = nil,
        email: String? = nil,
        password: String? = nil,
        phone: String? = nil,
        userStatus: Int32? = nil
    ) {
        self.id = id
        self.username = username
        self.firstName = firstName
        self.lastName = lastName
        self.email = email
        self.password = password
        self.phone = phone
        self.userStatus = userStatus
    }
}
