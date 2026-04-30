import Foundation

public struct ApiResponse: Codable {
    public let code: Int32?
    public let type: String?
    public let message: String?

    public init(
        code: Int32? = nil,
        type: String? = nil,
        message: String? = nil
    ) {
        self.code = code
        self.type = type
        self.message = message
    }
}
