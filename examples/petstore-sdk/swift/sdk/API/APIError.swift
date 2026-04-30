import Foundation

public enum APIError: Error {
    case clientError(statusCode: Int, body: Data)
    case serverError(statusCode: Int, body: Data)
    case unexpectedStatus(statusCode: Int, body: Data)
    case decodingFailed(Error)
    case transport(Error)
}
