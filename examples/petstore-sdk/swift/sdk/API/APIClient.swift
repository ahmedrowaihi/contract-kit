import Foundation

public final class APIClient {
    public let baseURL: URL
    public let session: URLSession
    public let decoder: JSONDecoder
    public let encoder: JSONEncoder
    public let interceptors: APIInterceptors
    public var auth: [String: Auth] = [:]

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
        self.interceptors = APIInterceptors()
    }

    public func execute<T: Decodable>(
        _ request: URLRequest,
        as type: T.Type,
        extraInterceptors: [(URLRequest) async throws -> URLRequest] = [],
        responseValidator: ((Data, HTTPURLResponse) async throws -> Void)? = nil,
        responseTransformer: ((Data) async throws -> Data)? = nil
    ) async throws -> T {
        let (data, httpResponse) = try await sendAndDispatch(request, extraInterceptors: extraInterceptors)
        if let validator = responseValidator {
            try await validator(data, httpResponse)
        }
        var body = data
        if let transformer = responseTransformer {
            body = try await transformer(data)
        }
        do {
            return try decoder.decode(T.self, from: body)
        } catch {
            throw APIError.decodingFailed(error)
        }
    }

    public func execute(
        _ request: URLRequest,
        extraInterceptors: [(URLRequest) async throws -> URLRequest] = [],
        responseValidator: ((Data, HTTPURLResponse) async throws -> Void)? = nil
    ) async throws -> Void {
        let (data, httpResponse) = try await sendAndDispatch(request, extraInterceptors: extraInterceptors)
        if let validator = responseValidator {
            try await validator(data, httpResponse)
        }
    }

    public func executeWithResponse<T: Decodable>(
        _ request: URLRequest,
        as type: T.Type,
        extraInterceptors: [(URLRequest) async throws -> URLRequest] = [],
        responseValidator: ((Data, HTTPURLResponse) async throws -> Void)? = nil,
        responseTransformer: ((Data) async throws -> Data)? = nil
    ) async throws -> (T, HTTPURLResponse) {
        let (data, httpResponse) = try await sendAndDispatch(request, extraInterceptors: extraInterceptors)
        if let validator = responseValidator {
            try await validator(data, httpResponse)
        }
        var body = data
        if let transformer = responseTransformer {
            body = try await transformer(data)
        }
        do {
            let value = try decoder.decode(T.self, from: body)
            return (value, httpResponse)
        } catch {
            throw APIError.decodingFailed(error)
        }
    }

    public func executeWithResponse(
        _ request: URLRequest,
        extraInterceptors: [(URLRequest) async throws -> URLRequest] = [],
        responseValidator: ((Data, HTTPURLResponse) async throws -> Void)? = nil
    ) async throws -> HTTPURLResponse {
        let (data, httpResponse) = try await sendAndDispatch(request, extraInterceptors: extraInterceptors)
        if let validator = responseValidator {
            try await validator(data, httpResponse)
        }
        return httpResponse
    }

    public func executeRaw(
        _ request: URLRequest,
        extraInterceptors: [(URLRequest) async throws -> URLRequest] = [],
        responseValidator: ((Data, HTTPURLResponse) async throws -> Void)? = nil,
        responseTransformer: ((Data) async throws -> Data)? = nil
    ) async throws -> (Data, HTTPURLResponse) {
        let (data, httpResponse) = try await sendAndDispatch(request, extraInterceptors: extraInterceptors)
        if let validator = responseValidator {
            try await validator(data, httpResponse)
        }
        var body = data
        if let transformer = responseTransformer {
            body = try await transformer(data)
        }
        return (body, httpResponse)
    }

    private func sendAndDispatch(
        _ request: URLRequest,
        extraInterceptors: [(URLRequest) async throws -> URLRequest]
    ) async throws -> (Data, HTTPURLResponse) {
        var req = request
        for interceptor in interceptors.request {
            req = try await interceptor(req)
        }
        for interceptor in extraInterceptors {
            req = try await interceptor(req)
        }
        let (data, response) = try await session.data(for: req)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.transport(URLError(.badServerResponse))
        }
        switch httpResponse.statusCode {
        case 200..<300:
            return (data, httpResponse)
        case 400..<500:
            throw APIError.clientError(statusCode: httpResponse.statusCode, body: data)
        case 500..<600:
            throw APIError.serverError(statusCode: httpResponse.statusCode, body: data)
        default:
            throw APIError.unexpectedStatus(statusCode: httpResponse.statusCode, body: data)
        }
    }
}
