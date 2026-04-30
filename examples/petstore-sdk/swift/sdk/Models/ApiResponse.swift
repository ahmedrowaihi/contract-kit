import Foundation

public struct ApiResponse: Codable {
    public let code: Int32?
    public let type: String?
    public let message: String?
}
