import Foundation

public extension StoreAPI {
    /// GET /store/inventory
    func getInventory() async throws -> [String: Int32] {
        return try await self.getInventory(options: RequestOptions())
    }

    /// GET /store/inventory
    func getInventoryWithResponse() async throws -> ([String: Int32], HTTPURLResponse) {
        return try await self.getInventoryWithResponse(options: RequestOptions())
    }

    /// POST /store/order
    func placeOrder(
        body: Order
    ) async throws -> Order {
        return try await self.placeOrder(body: body, options: RequestOptions())
    }

    /// POST /store/order
    func placeOrderWithResponse(
        body: Order
    ) async throws -> (Order, HTTPURLResponse) {
        return try await self.placeOrderWithResponse(body: body, options: RequestOptions())
    }

    /// GET /store/order/{orderId}
    func getOrderById(
        orderId: Int64
    ) async throws -> Order {
        return try await self.getOrderById(orderId: orderId, options: RequestOptions())
    }

    /// GET /store/order/{orderId}
    func getOrderByIdWithResponse(
        orderId: Int64
    ) async throws -> (Order, HTTPURLResponse) {
        return try await self.getOrderByIdWithResponse(orderId: orderId, options: RequestOptions())
    }

    /// DELETE /store/order/{orderId}
    func deleteOrder(
        orderId: Int64
    ) async throws {
        try await self.deleteOrder(orderId: orderId, options: RequestOptions())
    }

    /// DELETE /store/order/{orderId}
    func deleteOrderWithResponse(
        orderId: Int64
    ) async throws -> HTTPURLResponse {
        return try await self.deleteOrderWithResponse(orderId: orderId, options: RequestOptions())
    }

    /// POST /shapes
    func createShape(
        body: Data
    ) async throws -> CreateShape_Response {
        return try await self.createShape(body: body, options: RequestOptions())
    }

    /// POST /shapes
    func createShapeWithResponse(
        body: Data
    ) async throws -> (CreateShape_Response, HTTPURLResponse) {
        return try await self.createShapeWithResponse(body: body, options: RequestOptions())
    }

    /// POST /measurements
    func submitMeasurement(
        body: SubmitMeasurement_Body
    ) async throws {
        try await self.submitMeasurement(body: body, options: RequestOptions())
    }

    /// POST /measurements
    func submitMeasurementWithResponse(
        body: SubmitMeasurement_Body
    ) async throws -> HTTPURLResponse {
        return try await self.submitMeasurementWithResponse(body: body, options: RequestOptions())
    }
}
