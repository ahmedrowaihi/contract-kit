import Foundation

public struct Category: Codable {
    public let id: Int64?
    public let name: String?

    public init(
        id: Int64? = nil,
        name: String? = nil
    ) {
        self.id = id
        self.name = name
    }
}
