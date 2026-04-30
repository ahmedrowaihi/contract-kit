import Foundation

public struct Pet: Codable {
    public let id: Int64?
    public let name: String
    public let category: Category?
    public let photoUrls: [String]
    public let tags: [Tag]?
    public let status: Pet_Status?

    public init(
        id: Int64? = nil,
        name: String,
        category: Category? = nil,
        photoUrls: [String],
        tags: [Tag]? = nil,
        status: Pet_Status? = nil
    ) {
        self.id = id
        self.name = name
        self.category = category
        self.photoUrls = photoUrls
        self.tags = tags
        self.status = status
    }
}
