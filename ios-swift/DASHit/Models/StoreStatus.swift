import Foundation

public struct StoreStatus: Codable, Hashable {
    public let isOpen: Bool
    public let openHour: Int // e.g. 7 (7 AM)
    public let closeHour: Int // e.g. 23 (11 PM)
    public let deliveryEtaMinutes: Int
    public let announcement: String?
    
    public init(
        isOpen: Bool = true,
        openHour: Int = 7,
        closeHour: Int = 23,
        deliveryEtaMinutes: Int = 8,
        announcement: String? = nil
    ) {
        self.isOpen = isOpen
        self.openHour = openHour
        self.closeHour = closeHour
        self.deliveryEtaMinutes = deliveryEtaMinutes
        self.announcement = announcement
    }
}
