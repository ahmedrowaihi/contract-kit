import Foundation

public struct SubmitTags_Response: Codable {
    public let count: Int32?

    public init(
        count: Int32? = nil
    ) {
        self.count = count
    }
}
