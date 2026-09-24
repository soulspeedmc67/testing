import Foundation

/// Adds items to an order during its 60-second change window.
///
/// `firestore.rules` never lets a customer edit an order's items; it only
/// lets them cancel an order that is still "Placed". So an update is made the
/// way a store would record a correction: an order with everything in it is
/// created first, then the original is cancelled as replaced. If the original
/// can no longer be cancelled because the store has started on it, the new
/// order is withdrawn again, so the customer never ends up with two orders.
@MainActor
enum OrderUpdater {
    enum UpdateError: LocalizedError {
        case windowClosed
        case nothingAdded
        case notSignedIn
        case storeStartedPacking
        case network

        var errorDescription: String? {
            switch self {
            case .windowClosed:
                return "The 60 seconds are up and the store is packing your order."
            case .nothingAdded:
                return "Add at least one item first."
            case .notSignedIn:
                return "Please sign in again to change this order."
            case .storeStartedPacking:
                return "The store has already started packing, so this order can't be changed now."
            case .network:
                return "We couldn't reach the store. Check your connection and try again."
            }
        }
    }

    /// Returns the order that now stands in for `order`, with `additions` merged in.
    static func addItems(_ additions: [CartItem], to order: Order) async throws -> Order {
        guard order.modifySecondsRemaining() > 0 else { throw UpdateError.windowClosed }
        let additions = additions.filter { $0.qty > 0 }
        guard !additions.isEmpty else { throw UpdateError.nothingAdded }
        guard let user = AuthService.shared.currentUser,
              let uid = AuthService.shared.firebaseUID,
              uid == order.userId else {
            throw UpdateError.notSignedIn
        }

        var items = order.items
        for addition in additions {
            if let index = items.firstIndex(where: { $0.id == addition.id }) {
                items[index].qty += addition.qty
            } else {
                items.append(addition)
            }
        }
        let bill = CartBillBreakdown.calculate(
            items: items,
            appliedCoupon: order.couponCode.flatMap { Coupon.find(code: $0) }
        )

        let replacement = Order(
            id: Order.newCode(),
            userId: uid,
            items: items,
            subtotal: bill.subtotal,
            deliveryFee: bill.deliveryFee,
            discount: bill.couponDiscount,
            grandTotal: bill.grandTotal,
            status: .placed,
            deliveryAddress: order.deliveryAddress,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            etaMinutes: order.etaMinutes,
            // Same code at the door, and the window keeps the original deadline.
            otp: order.otp ?? Order.newDeliveryCode(),
            couponCode: order.couponCode,
            modifyWindowEndsAt: order.modifyWindowEnd.timeIntervalSince1970,
            replacesOrderId: order.id
        )
        let distance = DeliveryEta.quote(for: order.deliveryAddress.coordinate).distanceKm

        do {
            try await FirestoreService.shared.createOrder(replacement, customer: user, distanceKm: distance)
        } catch {
            // A timed-out write may still reach the server later; queue its
            // withdrawal behind it so it can never stand as a duplicate.
            if error is OrderWriteError {
                FirestoreService.shared.withdrawOrder(
                    orderId: replacement.id,
                    reason: "Withdrawn: the update to \(order.id) did not complete"
                )
            }
            throw UpdateError.network
        }

        do {
            try await FirestoreService.shared.cancelOrder(
                orderId: order.id,
                reason: "Replaced by \(replacement.id): customer added items"
            )
        } catch {
            FirestoreService.shared.withdrawOrder(
                orderId: replacement.id,
                reason: "Withdrawn: \(order.id) could no longer be changed"
            )
            throw UpdateError.storeStartedPacking
        }

        return replacement
    }
}
