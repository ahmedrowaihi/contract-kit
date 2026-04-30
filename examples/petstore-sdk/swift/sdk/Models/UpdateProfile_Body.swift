import Foundation

public struct UpdateProfile_Body: Codable {
    public let name: String
    public let nickname: String?

    public init(
        name: String,
        nickname: String? = nil
    ) {
        self.name = name
        self.nickname = nickname
    }
}
