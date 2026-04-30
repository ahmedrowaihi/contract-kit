import Foundation

public struct CreateShape_Response: Codable {
    public let id: UUID?

    public init(
        id: UUID? = nil
    ) {
        self.id = id
    }
}
