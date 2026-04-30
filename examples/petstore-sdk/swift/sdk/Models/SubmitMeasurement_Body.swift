import Foundation

public struct SubmitMeasurement_Body: Codable {
    public let value: Double

    public init(
        value: Double
    ) {
        self.value = value
    }
}
