import Foundation

/// Fast JSON & UserDefaults local persistence
final class LocalStorage {
    static let shared = LocalStorage()
    
    private let defaults = UserDefaults.standard
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    
    private let keyUser = "dashit_user_profile"
    private let keyCart = "dashit_cart_items"
    private let keyAddress = "dashit_saved_address"
    private let keyActiveOrderId = "dashit_active_order_id"
    
    private init() {}
    
    // MARK: - User Profile
    
    func saveUserProfile(_ profile: UserProfile) {
        if let data = try? encoder.encode(profile) {
            defaults.set(data, forKey: keyUser)
        }
    }
    
    func loadUserProfile() -> UserProfile? {
        guard let data = defaults.data(forKey: keyUser) else { return nil }
        return try? decoder.decode(UserProfile.self, from: data)
    }
    
    func clearUserProfile() {
        defaults.removeObject(forKey: keyUser)
    }
    
    // MARK: - Cart Items
    
    func saveCartItems(_ items: [CartItem]) {
        if let data = try? encoder.encode(items) {
            defaults.set(data, forKey: keyCart)
        }
    }
    
    func loadCartItems() -> [CartItem] {
        guard let data = defaults.data(forKey: keyCart) else { return [] }
        return (try? decoder.decode([CartItem].self, from: data)) ?? []
    }
    
    // MARK: - Saved Address
    
    func saveAddress(_ address: DeliveryAddress) {
        if let data = try? encoder.encode(address) {
            defaults.set(data, forKey: keyAddress)
        }
    }
    
    func loadAddress() -> DeliveryAddress? {
        guard let data = defaults.data(forKey: keyAddress) else { return nil }
        return try? decoder.decode(DeliveryAddress.self, from: data)
    }
    
    // MARK: - Active Order
    
    func saveActiveOrderId(_ id: String?) {
        if let id = id {
            defaults.set(id, forKey: keyActiveOrderId)
        } else {
            defaults.removeObject(forKey: keyActiveOrderId)
        }
    }
    
    func loadActiveOrderId() -> String? {
        defaults.string(forKey: keyActiveOrderId)
    }
    
    // MARK: - Purge
    
    func clearAll() {
        defaults.removeObject(forKey: keyUser)
        defaults.removeObject(forKey: keyCart)
        defaults.removeObject(forKey: keyAddress)
        defaults.removeObject(forKey: keyActiveOrderId)
    }
}
