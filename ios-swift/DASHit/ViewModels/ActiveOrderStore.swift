import Foundation
import SwiftUI
import FirebaseFirestore

/// Watches the shopper's in-flight order for the app-wide tracker and keeps the
/// Live Activity in step with it, even when the tracking screen is closed.
@MainActor
final class ActiveOrderStore: ObservableObject {
    static let shared = ActiveOrderStore()

    @Published private(set) var order: Order?
    /// Set when checkout succeeds; RootView opens live tracking once the cart
    /// and checkout sheets have finished dismissing.
    @Published var pendingTrackingPresentation = false

    private var listener: ListenerRegistration?
    private var listeningOrderId: String?

    private init() {}

    /// Called by checkout once the server has accepted the order.
    func orderPlaced(_ placed: Order) {
        withAnimation(.dashitSpring) {
            order = placed
        }
        pendingTrackingPresentation = true
        track(orderId: placed.id)
    }
    
    /// Picks up the active order saved by checkout (also after a relaunch).
    func refresh() {
        track(orderId: LocalStorage.shared.loadActiveOrderId())
    }

    func track(orderId: String?) {
        guard orderId != listeningOrderId else { return }
        listener?.remove()
        listener = nil
        listeningOrderId = orderId

        guard let orderId else {
            order = nil
            return
        }

        listener = FirestoreService.shared.listenOrder(orderId: orderId) { [weak self] order in
            // A nil snapshot (cache miss, brief permission gap) keeps the last
            // known order on screen rather than blanking the tracker.
            guard let self = self, let order = order else { return }
            withAnimation(.dashitSpring) {
                self.order = order
            }
            LiveActivityManager.shared.sync(with: order)
        }
    }

    #if DEBUG
    /// A fixed in-flight order for the simulator screenshot job; no Firestore.
    func showDemoOrder() {
        let items = Array(CartViewModel.shared.items.prefix(3))
        order = Order(
            id: "DEMO-ORDER",
            userId: "demo",
            items: items,
            subtotal: 420,
            deliveryFee: 0,
            discount: 0,
            grandTotal: 420,
            status: .outForDelivery,
            deliveryAddress: DeliveryAddress(street: "Court Road, Lal Chowk"),
            driverName: "Aamir",
            etaMinutes: 6
        )
    }
    #endif
    
    /// Dismisses a delivered or cancelled order from the tracker.
    func retireFinishedOrder() {
        guard order?.status.stage.isFinished == true else { return }
        LocalStorage.shared.saveActiveOrderId(nil)
        withAnimation(.dashitSpring) {
            track(orderId: nil)
        }
    }
}
