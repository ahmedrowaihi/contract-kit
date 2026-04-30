import Foundation

public enum Auth {
    case bearer(token: String)
    case apiKey(name: String, value: String, in: APIKeyLocation)
    case basic(username: String, password: String)

    public func apply(
        to request: URLRequest
    ) -> URLRequest {
        var request = request
        switch self {
        case .bearer(let token):
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        case .apiKey(let name, let value, let location):
            switch location {
            case .header:
                request.setValue(value, forHTTPHeaderField: name)
            case .query:
                if let url = request.url {
                    if let components = URLComponents(url: url, resolvingAgainstBaseURL: false) {
                        var items = components.queryItems ?? [URLQueryItem]()
                        items.append(URLQueryItem(name: name, value: value))
                        var mutable = components
                        mutable.queryItems = items
                        if let rebuilt = mutable.url {
                            request.url = rebuilt
                        }
                    }
                }
            case .cookie:
                let cookie = "\(name)=\(value)"
                if let existing = request.value(forHTTPHeaderField: "Cookie") {
                    request.setValue("\(existing); \(cookie)", forHTTPHeaderField: "Cookie")
                } else {
                    request.setValue(cookie, forHTTPHeaderField: "Cookie")
                }
            }
        case .basic(let username, let password):
            if let data = "\(username):\(password)".data(using: .utf8) {
                request.setValue("Basic \(data.base64EncodedString())", forHTTPHeaderField: "Authorization")
            }
        }
        return request
    }
}
