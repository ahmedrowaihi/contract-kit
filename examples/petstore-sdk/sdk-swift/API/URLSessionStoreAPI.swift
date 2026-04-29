import Foundation

public final class URLSessionStoreAPI: StoreAPI {
    let baseURL: URL
    let session: URLSession
    let decoder: JSONDecoder
    let encoder: JSONEncoder

    public init(
        baseURL: URL,
        session: URLSession = .shared,
        decoder: JSONDecoder = JSONDecoder(),
        encoder: JSONEncoder = JSONEncoder()
    ) {
        self.baseURL = baseURL
        self.session = session
        self.decoder = decoder
        self.encoder = encoder
    }

    /// GET /store/inventory
    public func getInventory() async throws -> [String: Int32] {
        let url = baseURL.appendingPathComponent("store/inventory")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        let (data, _) = try await session.data(for: request)
        return try decoder.decode([String: Int32].self, from: data)
    }

    /// POST /store/order
    public func placeOrder(
        body: Order
    ) async throws -> Order {
        let url = baseURL.appendingPathComponent("store/order")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(body)
        let (data, _) = try await session.data(for: request)
        return try decoder.decode(Order.self, from: data)
    }

    /// GET /store/order/{orderId}
    public func getOrderById(
        orderId: Int64
    ) async throws -> Order {
        let url = baseURL.appendingPathComponent("store/order/\(orderId)")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        let (data, _) = try await session.data(for: request)
        return try decoder.decode(Order.self, from: data)
    }

    /// DELETE /store/order/{orderId}
    public func deleteOrder(
        orderId: Int64
    ) async throws {
        let url = baseURL.appendingPathComponent("store/order/\(orderId)")
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        let (data, _) = try await session.data(for: request)
    }

    /// POST /shapes
    public func createShape(
        body: Any
    ) async throws -> CreateShape_Response {
        let url = baseURL.appendingPathComponent("shapes")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(body)
        let (data, _) = try await session.data(for: request)
        return try decoder.decode(CreateShape_Response.self, from: data)
    }

    /// POST /measurements
    public func submitMeasurement(
        body: SubmitMeasurement_Body
    ) async throws {
        let url = baseURL.appendingPathComponent("measurements")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(body)
        let (data, _) = try await session.data(for: request)
    }
}
