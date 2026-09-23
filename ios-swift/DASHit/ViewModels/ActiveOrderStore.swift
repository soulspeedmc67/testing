import Foundation
import SwiftUI
import FirebaseFirestore

/// Watches the shopper's in-flight order for the app-wide tracker and keeps the
/// Live Activity in step with it, even when the tracking screen is closed.
@MainActor
final class ActiveOrderStore: ObservableObject {
    static let shared = ActiveOrderStore()

    @Published private(set) var order: Order?

    private var listener: ListenerRegistration?
    private var listeningOrderId: String?

    private init() {}

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
            guard let self = self else { return }
            withAnimation(.dashitSpring) {
                self.order = order
            }
            if let order = order {
                LiveActivityManager.shared.sync(with: order)
            }
        }
    }

    /// Dismisses a delivered or cancelled order from the tracker.
    func retireFinishedOrder() {
        guard order?.status.stage.isFinished == true else { return }
        LocalStorage.shared.saveActiveOrderId(nil)
        withAnimation(.dashitSpring) {
            track(orderId: nil)
        }
    }
}
