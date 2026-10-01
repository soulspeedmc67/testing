import Foundation
import SwiftUI

@MainActor
final class CheckoutViewModel: ObservableObject {
    @Published var selectedAddress: DeliveryAddress
    /// Every way to pay online on this phone (see `PayOption`).
    let payOptions: [PayOption]
    /// "cod", or the id of a way to pay online picked here (a UPI app, any UPI,
    /// card, netbanking, wallet, EMI, Pay Later); Razorpay then opens on just
    /// that. The last choice is kept.
    @Published var paymentMethod: String = "cod"
    @Published var isSubmitting: Bool = false
    @Published var progressText = "Placing Order..."

    private static let lastPaymentKey = "dashit_last_payment_method"

    var paysOnline: Bool { paymentMethod != "cod" && OnlinePayment.isAvailable }
    var payOption: PayOption? { payOptions.first { $0.id == paymentMethod } }

    @Published var orderError: String?
    @Published var completedOrder: Order?

    init() {
        payOptions = PayOption.all
        self.selectedAddress = LocalStorage.shared.loadAddress() ?? DeliveryAddress(
            nickname: "Home",
            street: "Court Road, Lal Chowk",
            houseNumber: "House 12",
            city: "Anantnag",
            pincode: "192101",
            latitude: 33.7311,
            longitude: 75.1487
        )
        let saved = UserDefaults.standard.string(forKey: Self.lastPaymentKey)
        if let saved, saved != "cod" {
            // The older "online" choice, or an app since removed: the first UPI way.
            paymentMethod = payOptions.contains { $0.id == saved } ? saved : (payOptions.first?.id ?? "cod")
        }
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
        progressText = paysOnline ? "Opening payment..." : "Placing Order..."
        UserDefaults.standard.set(paymentMethod, forKey: Self.lastPaymentKey)
        defer { isSubmitting = false }

        // Paying online: the payment is taken and confirmed first, and only a
        // confirmed payment places the order.
        let code = Order.newCode()
        var receipt: PaymentReceipt?
        if paysOnline {
            do {
                receipt = try await OnlinePayment.shared.pay(orderCode: code, amountRupees: cart.bill.grandTotal, customer: user, option: payOption) { [weak self] in
                    self?.progressText = "Confirming payment..."
                }
                progressText = "Placing Order..."
            } catch {
                orderError = (error as? LocalizedError)?.errorDescription ?? "The payment didn't go through."
                if case OnlinePaymentError.cancelled = error {
                    HapticsManager.shared.light()
                } else {
                    HapticsManager.shared.error()
                }
                return false
            }
        }

        let order = Order(
            id: code,
            userId: uid,
            items: cart.items,
            subtotal: cart.bill.subtotal,
            deliveryFee: cart.bill.deliveryFee,
            discount: cart.bill.couponDiscount,
            grandTotal: cart.bill.grandTotal,
            status: .placed,
            deliveryAddress: selectedAddress,
            paymentMethod: receipt == nil ? "Cash on Delivery" : "Paid online",
            paymentStatus: receipt == nil ? "pending" : "paid",
            etaMinutes: store.etaMinutes(for: quote) ?? 8,
            otp: Order.newDeliveryCode(),
            couponCode: cart.appliedCoupon?.code
        )

        do {
            do {
                try await FirestoreService.shared.createOrder(order, customer: user, distanceKm: quote.distanceKm, payment: receipt)
            } catch where receipt != nil {
                // Already paid: one more try before giving up on the order.
                try await Task.sleep(for: .seconds(2))
                try await FirestoreService.shared.createOrder(order, customer: user, distanceKm: quote.distanceKm, payment: receipt)
            }

            // "Order placed" to the shopper's phones, "New order" to the store.
            Push.shared.orderChanged(order.id)
            LocalStorage.shared.saveActiveOrderId(order.id)
            completedOrder = order
            ActiveOrderStore.shared.orderPlaced(order)

            // Start iOS 17+ Lock Screen & Dynamic Island Live Activity
            LiveActivityManager.shared.startActivity(for: order)
            // Now the reason is obvious: ask to tell them when it's delivered.
            OrderNotifications.requestPermissionIfNeeded()

            cart.clearCart()
            HapticsManager.shared.success()
            SoundManager.shared.playOrderSuccess()
            return true
        } catch {
            #if DEBUG
            print("❌ [Checkout] Order write failed: \(error)")
            #endif
            if let receipt {
                orderError = "Your payment went through (\(receipt.razorpayPaymentId)), but the order couldn't be saved. Message us on WhatsApp with that payment ID and we'll sort it out."
            } else {
                orderError = "We couldn't reach the store to place your order. Check your connection and try again."
            }
            HapticsManager.shared.error()
            return false
        }
    }


}
