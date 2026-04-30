import Foundation

public struct UpdateProfile_Response: Codable {
    public let ok: Bool?

    public init(
        ok: Bool? = nil
    ) {
        self.ok = ok
    }
}
