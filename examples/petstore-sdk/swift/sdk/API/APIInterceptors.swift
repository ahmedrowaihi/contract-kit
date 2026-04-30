import Foundation

public final class APIInterceptors {
    public var request: [(URLRequest) async throws -> URLRequest] = []

    public init() {}
}
