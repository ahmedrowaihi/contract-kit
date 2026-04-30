import Foundation

public struct Rect: Codable {
    public let kind: Rect_Kind
    public let width: Double
    public let height: Double

    public init(
        kind: Rect_Kind,
        width: Double,
        height: Double
    ) {
        self.kind = kind
        self.width = width
        self.height = height
    }
}
