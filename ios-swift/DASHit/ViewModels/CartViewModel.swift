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

    /// Set once the shopper declares they are 18+, for the rest of the session,
    /// matching the web age gate (`src/context/AgeGateContext.jsx`).
    @Published private(set) var isAgeConfirmed: Bool = false

    private init() {
        self.items = LocalStorage.shared.loadCartItems()
        recalculate()
    }

    var totalQuantity: Int {
        items.reduce(0) { $0 + $1.qty }
    }

    /// Units of a product across all of its variants.
    func quantity(for productId: String) -> Int {
        items.filter { $0.productId == productId }.reduce(0) { $0 + $1.qty }
    }

    /// Units of one cart line (a product, or one variant of it).
    func quantity(forItemId itemId: String) -> Int {
        items.first(where: { $0.id == itemId })?.qty ?? 0
    }

    // MARK: - Age gate

    func requiresAgeConfirmation(for product: Product) -> Bool {
        product.ageRestricted == true && !isAgeConfirmed
    }

    func confirmAge() {
        isAgeConfirmed = true
    }

    // MARK: - Mutations

    func add(product: Product, variant: ProductVariant? = nil) {
        let itemId = variant?.id ?? product.id

        if let index = items.firstIndex(where: { $0.id == itemId }) {
            items[index].qty += 1
            HapticsManager.shared.tick()
        } else {
            let newItem = CartItem(
                id: itemId,
                productId: product.id,
                name: product.name,
                unit: variant?.unit ?? product.unit,
                price: variant?.price ?? product.price,
                originalPrice: variant?.originalPrice ?? product.originalPrice,
                img: product.img,
                cat: product.cat,
                qty: 1
            )
            items.append(newItem)
            HapticsManager.shared.addToCart()
        }
    }

    func increment(itemId: String) {
        guard let index = items.firstIndex(where: { $0.id == itemId }) else { return }
        items[index].qty += 1
        HapticsManager.shared.tick()
    }

    func decrement(itemId: String) {
        guard let index = items.firstIndex(where: { $0.id == itemId }) else { return }
        if items[index].qty > 1 {
            items[index].qty -= 1
            HapticsManager.shared.tick()
        } else {
            items.remove(at: index)
            HapticsManager.shared.rigid()
        }
    }

    /// The product card's minus button: takes a unit off the most recently added
    /// line for that product, whichever variant it is.
    func decrementLatest(productId: String) {
        guard let line = items.last(where: { $0.productId == productId }) else { return }
        decrement(itemId: line.id)
    }

    func remove(productId: String, variantId: String? = nil) {
        if let variantId {
            decrement(itemId: variantId)
        } else {
            decrementLatest(productId: productId)
        }
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
