import Foundation

public struct UserProfile: Codable, Identifiable, Hashable {
    public let id: String // Matches request.auth.uid
    public var mobile: String
    public var name: String?
    public var email: String?
    public var createdAt: Double?
    public var lastLoginAt: Double?
    public var defaultAddress: DeliveryAddress?
    
    public init(
        id: String,
        mobile: String,
        name: String? = nil,
        email: String? = nil,
        createdAt: Double? = Date().timeIntervalSince1970,
        lastLoginAt: Double? = Date().timeIntervalSince1970,
        defaultAddress: DeliveryAddress? = nil
    ) {
        self.id = id
        self.mobile = mobile
        self.name = name
        self.email = email
        self.createdAt = createdAt
        self.lastLoginAt = lastLoginAt
        self.defaultAddress = defaultAddress
    }
}
