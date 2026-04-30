import Foundation

public struct Order: Codable {
    public let id: Int64?
    public let petId: Int64?
    public let quantity: Int32?
    public let shipDate: Date?
    public let status: Order_Status?
    public let complete: Bool?

    public init(
        id: Int64? = nil,
        petId: Int64? = nil,
        quantity: Int32? = nil,
        shipDate: Date? = nil,
        status: Order_Status? = nil,
        complete: Bool? = nil
    ) {
        self.id = id
        self.petId = petId
        self.quantity = quantity
        self.shipDate = shipDate
        self.status = status
        self.complete = complete
    }
}
