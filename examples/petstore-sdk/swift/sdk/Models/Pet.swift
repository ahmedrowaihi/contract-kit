import Foundation

public struct Pet: Codable {
    public let id: Int64?
    public let name: String
    public let category: Category?
    public let photoUrls: [String]
    public let tags: [Tag]?
    public let status: Pet_Status?
}
