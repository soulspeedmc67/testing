import Foundation
import SwiftUI
import PassKit

@MainActor
final class CheckoutViewModel: ObservableObject {
    @Published var selectedAddress: DeliveryAddress
    @Published var paymentMethod: String = "cod" // "cod" or "apple_pay"
    @Published var isSubmitting: Bool = false
    @Published var orderError: String?
    @Published var completedOrder: Order?

    init() {
        self.selectedAddress = LocalStorage.shared.loadAddress() ?? DeliveryAddress(
            nickname: "Home",
            street: "Court Road, Lal Chowk",
            houseNumber: "House 12",
            city: "Anantnag",
            pincode: "192101",
            latitude: 33.7311,
            longitude: 75.1487
        )
    }

    /// ETA and serviceability for the selected address (web deliveryEta.js).
    var deliveryQuote: DeliveryEta.Quote {
        DeliveryEta.quote(for: selectedAddress.coordinate)
    }

    func reloadSavedAddress() {
        if let saved = LocalStorage.shared.loadAddress() {
            selectedAddress = saved
        }
    }

    func placeOrder(cart: CartViewModel, auth: AuthService) async -> Bool {
        orderError = nil

        // An empty cart satisfies the minimum-order check (subtotal 0), so it
        // has to be refused explicitly or a ₹0 order goes through.
        guard !cart.items.isEmpty else {
            orderError = "Your cart is empty."
            HapticsManager.shared.warning()
            return false
        }

        // Enforce ₹299 minimum order value
        guard cart.bill.isMinOrderSatisfied else {
            cart.showMinOrderModal = true
            HapticsManager.shared.warning()
            return false
        }

        guard let user = auth.currentUser, let uid = auth.firebaseUID else {
            HapticsManager.shared.warning()
            orderError = "Please sign in to complete your order."
            return false
        }
        // Apple and email accounts can be phone-less; the rider has to call.
        guard !user.mobile.isEmpty else {
            HapticsManager.shared.warning()
            orderError = "Add your delivery phone number in Profile so the rider can reach you."
            return false
        }

        // Same gates as the web checkout: the admin can close the store, and
        // only addresses within 5 km of the hub are served.
        let store = StoreStatusStore.shared
        guard store.isOpen else {
            orderError = "The store is closed right now. \(store.closeReason)"
            HapticsManager.shared.warning()
            return false
        }
        let quote = deliveryQuote
        guard quote.isDeliverable else {
            orderError = "Delivery isn't available at this address yet. It's \(quote.distanceText) from our Anantnag hub, and we deliver within 5 km."
            HapticsManager.shared.warning()
            return false
        }

        isSubmitting = true
        defer { isSubmitting = false }

        let order = Order(
            id: Order.newCode(),
            userId: uid,
            items: cart.items,
            subtotal: cart.bill.subtotal,
            deliveryFee: cart.bill.deliveryFee,
            discount: cart.bill.couponDiscount,
            grandTotal: cart.bill.grandTotal,
            status: .placed,
            deliveryAddress: selectedAddress,
            paymentMethod: paymentMethod == "apple_pay" ? "Apple Pay" : "Cash on Delivery",
            // Nothing is charged in-app yet, so no order is ever marked paid here.
            paymentStatus: "pending",
            etaMinutes: store.etaMinutes(for: quote) ?? 8,
            otp: Order.newDeliveryCode(),
            couponCode: cart.appliedCoupon?.code
        )

        do {
            try await FirestoreService.shared.createOrder(order, customer: user, distanceKm: quote.distanceKm)

            LocalStorage.shared.saveActiveOrderId(order.id)
            completedOrder = order
            ActiveOrderStore.shared.orderPlaced(order)

            // Start iOS 17+ Lock Screen & Dynamic Island Live Activity
            LiveActivityManager.shared.startActivity(for: order)

            cart.clearCart()
            HapticsManager.shared.success()
            SoundManager.shared.playOrderSuccess()
            return true
        } catch {
            #if DEBUG
            print("❌ [Checkout] Order write failed: \(error)")
            #endif
            orderError = "We couldn't reach the store to place your order. Check your connection and try again."
            HapticsManager.shared.error()
            return false
        }
    }


}
