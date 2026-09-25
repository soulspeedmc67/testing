import Foundation
import SwiftUI
import UIKit
import FirebaseFirestore

/// Watches the shopper's in-flight order for the app-wide tracker and keeps the
/// Live Activity in step with it, even when the tracking screen is closed.
@MainActor
final class ActiveOrderStore: ObservableObject {
    static let shared = ActiveOrderStore()

    @Published private(set) var order: Order?
    /// The rider's live position, ETA and progress for the active order.
    @Published private(set) var liveTracking: DriverLiveTracking?
    /// Set when checkout succeeds; RootView opens live tracking once the cart
    /// and checkout sheets have finished dismissing.
    @Published var pendingTrackingPresentation = false
    /// A delivered order whose celebration the shopper hasn't seen yet.
    @Published private(set) var deliveredCelebration: Order?

    private static let celebratedKey = "dashit_celebrated_orders"
    private static let notifiedKey = "dashit_delivery_notified_orders"

    private var listener: ListenerRegistration?
    private var trackingListener: ListenerRegistration?
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

    /// Switches the tracker, the saved active order and the Live Activity over
    /// to the order that replaced this one when items were added.
    func adoptReplacement(_ replacement: Order) {
        LocalStorage.shared.saveActiveOrderId(replacement.id)
        withAnimation(.dashitSpring) {
            order = replacement
        }
        track(orderId: replacement.id)
        LiveActivityManager.shared.startActivity(for: replacement)
    }

    /// Cancels the active order inside its change window. With `restoreCart`,
    /// its items go back in the cart, as the web's cancel sheet offers.
    func cancelActiveOrder(restoreCart: Bool) async -> Bool {
        guard let current = order, current.modifySecondsRemaining() > 0 else { return false }
        do {
            try await FirestoreService.shared.cancelOrder(orderId: current.id, reason: "Customer cancelled")
            if restoreCart {
                CartViewModel.shared.reorder(current.items)
            }
            HapticsManager.shared.warning()
            return true
        } catch {
            HapticsManager.shared.error()
            return false
        }
    }

    /// Picks up the active order saved by checkout (also after a relaunch).
    func refresh() {
        track(orderId: LocalStorage.shared.loadActiveOrderId())
    }

    /// Back in the foreground: bring the Live Activity up to date, and back if
    /// it was swiped away while the order is still in progress; and celebrate a
    /// delivery that happened while the app was away.
    func resume() {
        guard let order else { return }
        LiveActivityManager.shared.sync(with: order, tracking: liveTracking)
        noteDelivery(of: order)
    }

    /// The celebration was seen: remember it and retire the delivered order.
    func finishCelebration() {
        if let order = deliveredCelebration {
            Self.remember(order.id, under: Self.celebratedKey)
        }
        deliveredCelebration = nil
        retireFinishedOrder()
    }

    /// A delivered order celebrates once: straight away if the app is on screen,
    /// otherwise a notification now and the celebration when the app is next opened.
    private func noteDelivery(of order: Order) {
        guard order.status.stage == .delivered,
              !Self.contains(order.id, under: Self.celebratedKey),
              // Not for old orders found long after the fact.
              Date().timeIntervalSince1970 - order.createdAt < 12 * 60 * 60
        else { return }
        switch UIApplication.shared.applicationState {
        case .active:
            if deliveredCelebration?.id != order.id {
                deliveredCelebration = order
            }
        case .background:
            guard !Self.contains(order.id, under: Self.notifiedKey) else { return }
            Self.remember(order.id, under: Self.notifiedKey)
            OrderNotifications.notifyDelivered(order)
        default:
            // Launching or briefly covered: resume() celebrates once the app is active.
            break
        }
    }

    private static func contains(_ id: String, under key: String) -> Bool {
        (UserDefaults.standard.stringArray(forKey: key) ?? []).contains(id)
    }

    private static func remember(_ id: String, under key: String) {
        var ids = UserDefaults.standard.stringArray(forKey: key) ?? []
        guard !ids.contains(id) else { return }
        ids.append(id)
        UserDefaults.standard.set(Array(ids.suffix(50)), forKey: key)
    }

    func track(orderId: String?) {
        guard orderId != listeningOrderId else { return }
        listener?.remove()
        listener = nil
        trackingListener?.remove()
        trackingListener = nil
        liveTracking = nil
        listeningOrderId = orderId

        guard let orderId else {
            order = nil
            return
        }

        trackingListener = FirestoreService.shared.listenDriverTracking(orderId: orderId) { [weak self] tracking in
            guard let self = self else { return }
            withAnimation(.easeInOut(duration: 0.8)) {
                self.liveTracking = tracking
            }
            if let order = self.order {
                LiveActivityManager.shared.sync(with: order, tracking: tracking)
            }
        }

        listener = FirestoreService.shared.listenOrder(orderId: orderId) { [weak self] order in
            // A nil snapshot (cache miss, brief permission gap) keeps the last
            // known order on screen rather than blanking the tracker.
            guard let self = self, let order = order else { return }
            withAnimation(.dashitSpring) {
                self.order = order
            }
            LiveActivityManager.shared.sync(with: order, tracking: self.liveTracking)
            self.noteDelivery(of: order)
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
            status: ScreenshotHooks.demoOrderPlaced ? .placed : .outForDelivery,
            deliveryAddress: DeliveryAddress(street: "Court Road, Lal Chowk"),
            driverName: ScreenshotHooks.demoOrderPlaced ? nil : "Aamir",
            etaMinutes: 6,
            otp: "4821"
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
