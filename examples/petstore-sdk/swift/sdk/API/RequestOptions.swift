import Foundation

public struct RequestOptions {
    public var client: APIClient? = nil
    public var baseURL: URL? = nil
    public var timeout: TimeInterval? = nil
    public var headers: [String: String] = [:]
    public var requestInterceptors: [(URLRequest) async throws -> URLRequest] = []
    public var responseValidator: ((Data, HTTPURLResponse) async throws -> Void)? = nil
    public var responseTransformer: ((Data) async throws -> Data)? = nil

    public init(
        client: APIClient? = nil,
        baseURL: URL? = nil,
        timeout: TimeInterval? = nil,
        headers: [String: String] = [:],
        requestInterceptors: [(URLRequest) async throws -> URLRequest] = [],
        responseValidator: ((Data, HTTPURLResponse) async throws -> Void)? = nil,
        responseTransformer: ((Data) async throws -> Data)? = nil
    ) {
        self.client = client
        self.baseURL = baseURL
        self.timeout = timeout
        self.headers = headers
        self.requestInterceptors = requestInterceptors
        self.responseValidator = responseValidator
        self.responseTransformer = responseTransformer
    }
}
