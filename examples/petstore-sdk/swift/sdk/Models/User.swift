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
}
