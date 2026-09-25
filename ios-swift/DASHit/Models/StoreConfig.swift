import Foundation

public struct StoreConfig: Codable, Hashable {
    public var isOpen: Bool
    public var closeReason: String
    public var isHighDemand: Bool
    public var maxOrdersPerHour: Int
    public var deliveryRadiusKm: Double

    public init(
        isOpen: Bool = true,
        closeReason: String = "Normal Operations",
        isHighDemand: Bool = false,
        maxOrdersPerHour: Int = 120,
        deliveryRadiusKm: Double = 8.5
    ) {
        self.isOpen = isOpen
        self.closeReason = closeReason
        self.isHighDemand = isHighDemand
        self.maxOrdersPerHour = maxOrdersPerHour
        self.deliveryRadiusKm = deliveryRadiusKm
    }

    public static let `default` = StoreConfig()
}
