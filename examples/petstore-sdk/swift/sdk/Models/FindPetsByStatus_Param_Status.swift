import Foundation

public enum FindPetsByStatus_Param_Status: String, Codable {
    case available = "available"
    case pending = "pending"
    case sold = "sold"
}
