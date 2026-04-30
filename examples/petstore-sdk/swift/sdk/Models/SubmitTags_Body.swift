import Foundation

public struct SubmitTags_Body: Codable {
    public let tags: [String]

    public init(
        tags: [String]
    ) {
        self.tags = tags
    }
}
