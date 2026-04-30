import Foundation

public protocol StoreAPI {
    /// GET /store/inventory
    func getInventory(
        options: RequestOptions
    ) async throws -> [String: Int32]

    /// GET /store/inventory
    func getInventoryWithResponse(
        options: RequestOptions
    ) async throws -> ([String: Int32], HTTPURLResponse)

    /// POST /store/order
    func placeOrder(
        body: Order,
        options: RequestOptions
    ) async throws -> Order

    /// POST /store/order
    func placeOrderWithResponse(
        body: Order,
        options: RequestOptions
    ) async throws -> (Order, HTTPURLResponse)

    /// GET /store/order/{orderId}
    func getOrderById(
        orderId: Int64,
        options: RequestOptions
    ) async throws -> Order

    /// GET /store/order/{orderId}
    func getOrderByIdWithResponse(
        orderId: Int64,
        options: RequestOptions
    ) async throws -> (Order, HTTPURLResponse)

    /// DELETE /store/order/{orderId}
    func deleteOrder(
        orderId: Int64,
        options: RequestOptions
    ) async throws

    /// DELETE /store/order/{orderId}
    func deleteOrderWithResponse(
        orderId: Int64,
        options: RequestOptions
    ) async throws -> HTTPURLResponse

    /// POST /shapes
    func createShape(
        body: Data,
        options: RequestOptions
    ) async throws -> CreateShape_Response

    /// POST /shapes
    func createShapeWithResponse(
        body: Data,
        options: RequestOptions
    ) async throws -> (CreateShape_Response, HTTPURLResponse)

    /// POST /measurements
    func submitMeasurement(
        body: SubmitMeasurement_Body,
        options: RequestOptions
    ) async throws

    /// POST /measurements
    func submitMeasurementWithResponse(
        body: SubmitMeasurement_Body,
        options: RequestOptions
    ) async throws -> HTTPURLResponse
}
