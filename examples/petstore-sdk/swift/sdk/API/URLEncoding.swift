import Foundation

public final class URLEncoding {
    private init() {}

    public static func query<T>(
        _ name: String,
        value: T?
    ) -> [URLQueryItem] {
        guard let value = value else {
            return []
        }
        return [URLQueryItem(name: name, value: "\(value)")]
    }

    public static func query<T>(
        _ name: String,
        values: [T]?,
        style: QueryStyle = .form,
        explode: Bool = true
    ) -> [URLQueryItem] {
        guard let values = values else {
            return []
        }
        if explode {
            return values.map { URLQueryItem(name: name, value: "\($0)") }
        }
        let separator = {
    switch style {
    case .form:
        return ","
    case .spaceDelimited:
        return " "
    case .pipeDelimited:
        return "|"
    }
}()
        let joined = values.map { "\($0)" }.joined(separator: separator)
        return [URLQueryItem(name: name, value: joined)]
    }
}
