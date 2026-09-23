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
        
        isSubmitting = true
        defer { isSubmitting = false }
        
        let order = Order(
            id: Self.newOrderCode(),
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
            etaMinutes: 8
        )
        
        do {
            try await FirestoreService.shared.createOrder(order, customer: user, couponCode: cart.appliedCoupon?.code)
            
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
    
    /// Short, readable order code, e.g. DSH-48213907.
    private static func newOrderCode() -> String {
        let clock = Int(Date().timeIntervalSince1970) % 10_000
        return "DSH-\(String(format: "%04d", clock))\(Int.random(in: 1000...9999))"
    }
}
