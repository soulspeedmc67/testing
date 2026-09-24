import Foundation
import SwiftUI
import CoreLocation

/// The address deliveries go to now, and every address the shopper has used,
/// most recent first. Kept on the device; addresses from past orders are
/// folded in once per launch and account, so the list is not empty for
/// existing shoppers.
@MainActor
final class AddressBook: ObservableObject {
    static let shared = AddressBook()

    @Published private(set) var current: DeliveryAddress?
    @Published private(set) var saved: [DeliveryAddress]

    private static let maxSaved = 12
    /// The placeholder coordinate orders fall back to when they carry none.
    private static let placeholder = DeliveryAddress().coordinate
    /// The account whose past orders were last folded in.
    private var importedUid: String?

    private init() {
        let current = LocalStorage.shared.loadAddress()
        var saved = LocalStorage.shared.loadAddressBook()
        // Shoppers from before the address book had only the one address.
        if saved.isEmpty, let current {
            saved = [current]
        }
        self.current = current
        self.saved = saved
    }

    /// Delivers here from now on and keeps it at the top of the saved list.
    func use(_ address: DeliveryAddress) {
        LocalStorage.shared.saveAddress(address)
        withAnimation(.dashitSpring) {
            current = address
            saved = Array(([address] + saved.filter { !Self.isSamePlace($0, address) }).prefix(Self.maxSaved))
        }
        LocalStorage.shared.saveAddressBook(saved)
    }

    func remove(_ address: DeliveryAddress) {
        withAnimation(.dashitSpring) {
            saved.removeAll { $0.id == address.id }
        }
        LocalStorage.shared.saveAddressBook(saved)
    }

    func isCurrent(_ address: DeliveryAddress) -> Bool {
        guard let current else { return false }
        return Self.isSamePlace(current, address)
    }

    /// Adds the addresses of the shopper's past orders that the list is
    /// missing. Orders without real coordinates are skipped: the rider would be
    /// sent to the placeholder pin.
    func importPastOrders(uid: String?) async {
        guard let uid, uid != importedUid else { return }
        importedUid = uid
        let orders = await FirestoreService.shared.fetchUserOrders(userId: uid)
        var merged = saved
        for address in orders.map(\.deliveryAddress) where merged.count < Self.maxSaved {
            let hasPin = DeliveryEta.haversineKm(from: address.coordinate, to: Self.placeholder) > 0.001
            let hasStreet = !address.street.trimmingCharacters(in: .whitespaces).isEmpty
            guard hasPin, hasStreet, !merged.contains(where: { Self.isSamePlace($0, address) }) else { continue }
            merged.append(address)
        }
        guard merged.count != saved.count else { return }
        withAnimation(.dashitSpring) {
            saved = merged
        }
        LocalStorage.shared.saveAddressBook(saved)
    }

    /// After account deletion: nothing of the old account stays on screen.
    func forgetAll() {
        current = nil
        saved = []
        importedUid = nil
    }

    /// Same door: the same saved entry, or within 25 m with the same house.
    private static func isSamePlace(_ a: DeliveryAddress, _ b: DeliveryAddress) -> Bool {
        if a.id == b.id { return true }
        let house = { (address: DeliveryAddress) in
            (address.houseNumber ?? "").trimmingCharacters(in: .whitespaces).lowercased()
        }
        return DeliveryEta.haversineKm(from: a.coordinate, to: b.coordinate) < 0.025 && house(a) == house(b)
    }
}
