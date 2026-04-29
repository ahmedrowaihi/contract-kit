import Foundation

public protocol StoreAPI {
    /// GET /store/inventory
    func getInventory() async throws -> [String: Int32]

    /// POST /store/order
    func placeOrder(
        body: Order
    ) async throws -> Order

    /// GET /store/order/{orderId}
    func getOrderById(
        orderId: Int64
    ) async throws -> Order

    /// DELETE /store/order/{orderId}
    func deleteOrder(
        orderId: Int64
    ) async throws

    /// POST /shapes
    func createShape(
        body: Any
    ) async throws -> CreateShape_Response

    /// POST /measurements
    func submitMeasurement(
        body: SubmitMeasurement_Body
    ) async throws
}
