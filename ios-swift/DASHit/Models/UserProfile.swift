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

/// Profiles are shared with the web app, which writes server Timestamps and
/// sometimes only a subset of fields, so reads are lenient.
extension UserProfile {
    private enum DecodingKeys: String, CodingKey {
        case id, uid, mobile, phone, phoneNumber, name, displayName, email, createdAt, lastLoginAt, defaultAddress
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: DecodingKeys.self)
        guard let id = c.flexibleString(.id) ?? c.flexibleString(.uid) else {
            throw DecodingError.keyNotFound(
                DecodingKeys.id,
                DecodingError.Context(codingPath: c.codingPath, debugDescription: "Profile has no id")
            )
        }
        let rawMobile = c.flexibleString(.mobile) ?? c.flexibleString(.phone) ?? c.flexibleString(.phoneNumber) ?? ""
        self.init(
            id: id,
            mobile: String(rawMobile.filter(\.isNumber).suffix(10)),
            name: c.flexibleString(.name) ?? c.flexibleString(.displayName),
            email: c.flexibleString(.email),
            createdAt: c.flexibleTimestamp(.createdAt),
            lastLoginAt: c.flexibleTimestamp(.lastLoginAt),
            defaultAddress: try? c.decode(DeliveryAddress.self, forKey: .defaultAddress)
        )
    }
}
