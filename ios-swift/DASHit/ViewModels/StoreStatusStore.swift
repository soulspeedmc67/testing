import Foundation
import SwiftUI
import FirebaseFirestore

/// Store open/closed and high-demand state from `config/store`, which the
/// admin console controls (web: `useStoreDetails` in `src/lib/storeStatus.js`).
@MainActor
final class StoreStatusStore: ObservableObject {
    static let shared = StoreStatusStore()

    @Published private(set) var isOpen = true
    @Published private(set) var closeReason = ""
    @Published private(set) var highDemand = false

    private var listener: ListenerRegistration?

    /// Web copy when the admin closes the store without giving a reason.
    static let defaultCloseReason = "Night hours — reopening tomorrow at 7:00 AM"

    private init() {
        listener = FirestoreService.shared.listenStoreConfig { [weak self] isOpen, closeReason, highDemand in
            guard let self = self else { return }
            withAnimation(.dashitSpring) {
                self.isOpen = isOpen
                self.closeReason = closeReason.isEmpty ? Self.defaultCloseReason : closeReason
                self.highDemand = highDemand
            }
        }
    }

    /// The promise shown in the header: the address's ETA, or the web's fixed
    /// 18 minutes while the store is flagged as under high demand.
    func etaMinutes(for quote: DeliveryEta.Quote) -> Int? {
        guard let eta = quote.etaMinutes else { return nil }
        return highDemand ? max(eta, 18) : eta
    }
}
