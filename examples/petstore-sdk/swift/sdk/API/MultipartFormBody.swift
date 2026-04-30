import Foundation

public final class MultipartFormBody {
    public let boundary: String
    public let contentType: String
    private var data: Data

    public init(
        boundary: String = UUID().uuidString
    ) {
        self.boundary = boundary
        self.contentType = "multipart/form-data; boundary=\(boundary)"
        self.data = Data()
    }

    public func append(
        _ value: String,
        name: String
    ) -> Void {
        if let encoded = "--\(boundary)\r\n".data(using: .utf8) {
            data.append(encoded)
        }
        if let encoded = "Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n".data(using: .utf8) {
            data.append(encoded)
        }
        if let encoded = value.data(using: .utf8) {
            data.append(encoded)
        }
        if let encoded = "\r\n".data(using: .utf8) {
            data.append(encoded)
        }
    }

    public func append(
        _ blob: Data,
        name: String,
        filename: String,
        mimeType: String = "application/octet-stream"
    ) -> Void {
        if let encoded = "--\(boundary)\r\n".data(using: .utf8) {
            data.append(encoded)
        }
        if let encoded = "Content-Disposition: form-data; name=\"\(name)\"; filename=\"\(filename)\"\r\nContent-Type: \(mimeType)\r\n\r\n".data(using: .utf8) {
            data.append(encoded)
        }
        data.append(blob)
        if let encoded = "\r\n".data(using: .utf8) {
            data.append(encoded)
        }
    }

    public func finalize() -> Data {
        if let encoded = "--\(boundary)--\r\n".data(using: .utf8) {
            data.append(encoded)
        }
        return data
    }
}
