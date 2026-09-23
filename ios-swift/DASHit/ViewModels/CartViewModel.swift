import Foundation
import SwiftUI

@MainActor
final class CartViewModel: ObservableObject {
    static let shared = CartViewModel()
    
    @Published var items: [CartItem] = [] {
        didSet {
            recalculate()
            LocalStorage.shared.saveCartItems(items)
        }
    }
    
    @Published var appliedCoupon: Coupon? {
        didSet {
            recalculate()
        }
    }
    
    @Published var bill: CartBillBreakdown = CartBillBreakdown.calculate(items: [], appliedCoupon: nil)
    @Published var showMinOrderModal: Bool = false
    @Published var isCartSheetPresented: Bool = false
    
    private init() {
        self.items = LocalStorage.shared.loadCartItems()
        recalculate()
    }
    
    func quantity(for productId: String) -> Int {
        items.first(where: { $0.productId == productId })?.qty ?? 0
    }
    
    func add(product: Product, variant: ProductVariant? = nil) {
        let itemId = variant?.id ?? product.id
        let price = variant?.price ?? product.price
        let unit = variant?.unit ?? product.unit
        
        if let index = items.firstIndex(where: { $0.id == itemId }) {
            items[index].qty += 1
        } else {
            let newItem = CartItem(
                id: itemId,
                productId: product.id,
                name: product.name,
                unit: unit,
                price: price,
                originalPrice: variant?.originalPrice ?? product.originalPrice,
                img: product.img,
                cat: product.cat,
                qty: 1
            )
            items.append(newItem)
        }
        
        HapticsManager.shared.light()
    }
    
    func remove(productId: String, variantId: String? = nil) {
        let itemId = variantId ?? productId
        guard let index = items.firstIndex(where: { $0.id == itemId }) else { return }
        
        if items[index].qty > 1 {
            items[index].qty -= 1
        } else {
            items.remove(at: index)
        }
        
        HapticsManager.shared.light()
    }
    
    func applyCoupon(_ coupon: Coupon) {
        if bill.subtotal >= coupon.minOrder {
            self.appliedCoupon = coupon
            HapticsManager.shared.success()
        } else {
            HapticsManager.shared.warning()
        }
    }
    
    func removeCoupon() {
        self.appliedCoupon = nil
        HapticsManager.shared.light()
    }
    
    func clearCart() {
        items.removeAll()
        appliedCoupon = nil
    }
    
    private func recalculate() {
        // Validate applied coupon against live subtotal
        if let coupon = appliedCoupon {
            let subtotal = items.reduce(0.0) { $0 + ($1.price * Double($1.qty)) }
            if subtotal < coupon.minOrder {
                self.appliedCoupon = nil
            }
        }
        
        self.bill = CartBillBreakdown.calculate(items: items, appliedCoupon: appliedCoupon)
    }
}
