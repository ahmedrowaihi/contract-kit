import Foundation

public enum Auth {
    case bearer(token: String)
    case apiKey(name: String, value: String)
    case basic(username: String, password: String)

    public func apply(
        to request: URLRequest
    ) -> URLRequest {
        var request = request
        switch self {
        case .bearer(let token):
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        case .apiKey(let name, let value):
            request.setValue(value, forHTTPHeaderField: name)
        case .basic(let username, let password):
            if let data = "\(username):\(password)".data(using: .utf8) {
                request.setValue("Basic \(data.base64EncodedString())", forHTTPHeaderField: "Authorization")
            }
        }
        return request
    }
}
