import Foundation
import ActivityKit

public struct DASHitOrderAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var status: String       // "placed", "packing", "out_for_delivery", "delivered"
        public var etaMinutes: Int      // e.g. 8
        public var driverName: String?
        public var progress: Double     // 0.0 to 1.0
        
        public init(status: String, etaMinutes: Int, driverName: String? = nil, progress: Double = 0.25) {
            self.status = status
            self.etaMinutes = etaMinutes
            self.driverName = driverName
            self.progress = progress
        }
    }
    
    public var orderId: String
    public var itemCount: Int
    public var totalAmount: Double
    
    public init(orderId: String, itemCount: Int, totalAmount: Double) {
        self.orderId = orderId
        self.itemCount = itemCount
        self.totalAmount = totalAmount
    }
}
