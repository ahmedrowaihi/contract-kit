import Foundation

public struct Order: Codable {
    public let id: Int64?
    public let petId: Int64?
    public let quantity: Int32?
    public let shipDate: String?
    public let status: Order_Status?
    public let complete: Bool?
}
