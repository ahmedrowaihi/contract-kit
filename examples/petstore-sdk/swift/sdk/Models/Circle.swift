import Foundation

public struct Circle: Codable {
    public let kind: Circle_Kind
    public let radius: Double

    public init(
        kind: Circle_Kind,
        radius: Double
    ) {
        self.kind = kind
        self.radius = radius
    }
}
