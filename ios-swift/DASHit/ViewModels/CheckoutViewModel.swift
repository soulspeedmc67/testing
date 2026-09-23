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
        // Enforce ₹299 minimum order value
        guard cart.bill.isMinOrderSatisfied else {
            cart.showMinOrderModal = true
            HapticsManager.shared.warning()
            return false
        }
        
        guard let user = auth.currentUser else {
            HapticsManager.shared.warning()
            orderError = "Please log in to complete your order."
            return false
        }
        
        isSubmitting = true
        defer { isSubmitting = false }
        
        let orderId = "DASH-\(Int(Date().timeIntervalSince1970))-\(Int.random(in: 100...999))"
        
        let newOrder = Order(
            id: orderId,
            userId: user.id,
            items: cart.items,
            subtotal: cart.bill.subtotal,
            deliveryFee: cart.bill.deliveryFee,
            discount: cart.bill.couponDiscount,
            grandTotal: cart.bill.grandTotal,
            status: .placed,
            deliveryAddress: selectedAddress,
            paymentMethod: paymentMethod,
            paymentStatus: paymentMethod == "apple_pay" ? "completed" : "pending"
        )
        
        do {
            _ = try await FirestoreService.shared.placeOrder(newOrder)
            LocalStorage.shared.saveActiveOrderId(orderId)
            ActiveOrderStore.shared.track(orderId: orderId)
            self.completedOrder = newOrder
            
            // Start iOS 17+ Lock Screen & Dynamic Island Live Activity
            LiveActivityManager.shared.startActivity(for: newOrder)
            
            // Clear cart
            cart.clearCart()
            
            // Trigger feedback
            HapticsManager.shared.success()
            SoundManager.shared.playOrderSuccess()
            
            return true
        } catch {
            self.orderError = error.localizedDescription
            HapticsManager.shared.error()
            return false
        }
    }
}
