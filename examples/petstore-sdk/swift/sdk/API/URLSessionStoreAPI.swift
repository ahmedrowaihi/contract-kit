import Foundation

public final class URLSessionStoreAPI: StoreAPI {
    let client: APIClient

    public init(
        client: APIClient
    ) {
        self.client = client
    }

    /// GET /store/inventory
    public func getInventory(
        options: RequestOptions = RequestOptions()
    ) async throws -> [String: Int32] {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("store/inventory")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        for schemeName in ["api_key"] {
            if let auth = client.auth[schemeName] {
                request = auth.apply(to: request)
            }
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.execute(request, as: [String: Int32].self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// GET /store/inventory
    public func getInventoryWithResponse(
        options: RequestOptions = RequestOptions()
    ) async throws -> ([String: Int32], HTTPURLResponse) {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("store/inventory")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        for schemeName in ["api_key"] {
            if let auth = client.auth[schemeName] {
                request = auth.apply(to: request)
            }
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.executeWithResponse(request, as: [String: Int32].self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// POST /store/order
    public func placeOrder(
        body: Order,
        options: RequestOptions = RequestOptions()
    ) async throws -> Order {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("store/order")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try client.encoder.encode(body)
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.execute(request, as: Order.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// POST /store/order
    public func placeOrderWithResponse(
        body: Order,
        options: RequestOptions = RequestOptions()
    ) async throws -> (Order, HTTPURLResponse) {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("store/order")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try client.encoder.encode(body)
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.executeWithResponse(request, as: Order.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// GET /store/order/{orderId}
    public func getOrderById(
        orderId: Int64,
        options: RequestOptions = RequestOptions()
    ) async throws -> Order {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("store/order/\(orderId)")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.execute(request, as: Order.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// GET /store/order/{orderId}
    public func getOrderByIdWithResponse(
        orderId: Int64,
        options: RequestOptions = RequestOptions()
    ) async throws -> (Order, HTTPURLResponse) {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("store/order/\(orderId)")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.executeWithResponse(request, as: Order.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// DELETE /store/order/{orderId}
    public func deleteOrder(
        orderId: Int64,
        options: RequestOptions = RequestOptions()
    ) async throws {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("store/order/\(orderId)")
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        try await client.execute(request, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator)
    }

    /// DELETE /store/order/{orderId}
    public func deleteOrderWithResponse(
        orderId: Int64,
        options: RequestOptions = RequestOptions()
    ) async throws -> HTTPURLResponse {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("store/order/\(orderId)")
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.executeWithResponse(request, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator)
    }

    /// POST /shapes
    public func createShape(
        body: Data,
        options: RequestOptions = RequestOptions()
    ) async throws -> CreateShape_Response {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("shapes")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = body
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.execute(request, as: CreateShape_Response.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// POST /shapes
    public func createShapeWithResponse(
        body: Data,
        options: RequestOptions = RequestOptions()
    ) async throws -> (CreateShape_Response, HTTPURLResponse) {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("shapes")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = body
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.executeWithResponse(request, as: CreateShape_Response.self, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator, responseTransformer: options.responseTransformer)
    }

    /// POST /measurements
    public func submitMeasurement(
        body: SubmitMeasurement_Body,
        options: RequestOptions = RequestOptions()
    ) async throws {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("measurements")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try client.encoder.encode(body)
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        try await client.execute(request, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator)
    }

    /// POST /measurements
    public func submitMeasurementWithResponse(
        body: SubmitMeasurement_Body,
        options: RequestOptions = RequestOptions()
    ) async throws -> HTTPURLResponse {
        let client = options.client ?? self.client
        let baseURL = options.baseURL ?? client.baseURL
        let url = baseURL.appendingPathComponent("measurements")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        if let timeout = options.timeout {
            request.timeoutInterval = timeout
        }
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try client.encoder.encode(body)
        for header in options.headers {
            request.setValue(header.value, forHTTPHeaderField: header.key)
        }
        return try await client.executeWithResponse(request, extraInterceptors: options.requestInterceptors, responseValidator: options.responseValidator)
    }
}
