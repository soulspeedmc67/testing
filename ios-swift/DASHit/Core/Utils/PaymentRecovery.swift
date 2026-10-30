import Foundation

/// An online payment that was started but whose order isn't placed yet. It is
/// saved on the phone the moment Razorpay's order exists, with everything the
/// order needs, so a payment the app couldn't confirm in time (a UPI app that
/// settles a minute late, a dropped connection, the app closed) still ends in
/// an order: `PaymentRecovery` keeps asking the server until it is paid.
struct PendingPayment: Codable, Hashable {
    let razorpayOrderId: String
    let orderCode: String
    let userId: String
    let customer: UserProfile
    let items: [CartItem]
    let subtotal: Double
    let deliveryFee: Double
    let discount: Double
    let grandTotal: Double
    let address: DeliveryAddress
    let etaMinutes: Int?
    let otp: String?
    let couponCode: String?
    let nightDeliveryFee: Double
    let extraDeliveryFee: Double
    let extraDeliveryLabel: String?
    let distanceKm: Double?
    let walletUsed: Int
    let startedAt: Double

    init(order: Order, customer: UserProfile, razorpayOrderId: String) {
        self.razorpayOrderId = razorpayOrderId
        orderCode = order.id
        userId = order.userId
        self.customer = customer
        items = order.items
        subtotal = order.subtotal
        deliveryFee = order.deliveryFee
        discount = order.discount
        grandTotal = order.grandTotal
        address = order.deliveryAddress
        etaMinutes = order.etaMinutes
        otp = order.otp
        couponCode = order.couponCode
        nightDeliveryFee = order.nightDeliveryFee
        extraDeliveryFee = order.extraDeliveryFee
        extraDeliveryLabel = order.extraDeliveryLabel
        distanceKm = order.distanceKm
        walletUsed = order.walletUsed
        startedAt = Date().timeIntervalSince1970
    }

    /// The order this payment is for, as it was on the checkout screen.
    func makeOrder() -> Order {
        Order(
            id: orderCode,
            userId: userId,
            items: items,
            subtotal: subtotal,
            deliveryFee: deliveryFee,
            discount: discount,
            grandTotal: grandTotal,
            createdAt: startedAt,
            deliveryAddress: address,
            paymentMethod: "Paid online",
            paymentStatus: "paid",
            etaMinutes: etaMinutes,
            otp: otp,
            couponCode: couponCode,
            nightDeliveryFee: nightDeliveryFee,
            extraDeliveryFee: extraDeliveryFee,
            extraDeliveryLabel: extraDeliveryLabel,
            distanceKm: distanceKm,
            walletUsed: walletUsed
        )
    }
}

/// The saved payments, in UserDefaults (small, and it survives the app being closed).
enum PendingPayments {
    private static let key = "dashit_pending_payments"

    static func all() -> [PendingPayment] {
        guard let data = UserDefaults.standard.data(forKey: key),
              let list = try? JSONDecoder().decode([PendingPayment].self, from: data) else { return [] }
        return list
    }

    static func add(_ payment: PendingPayment) {
        var list = all().filter { $0.orderCode != payment.orderCode }
        list.append(payment)
        save(list)
    }

    static func remove(orderCode: String) {
        save(all().filter { $0.orderCode != orderCode })
    }

    private static func save(_ list: [PendingPayment]) {
        if let data = try? JSONEncoder().encode(list) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }
}

/// Places the order for every saved payment that Razorpay took money for.
///
/// A payment that was never paid (the shopper backed out) is forgotten after
/// `unpaidLifetime`; one that was paid stays until its order is placed, however
/// long that takes, so money taken always ends in an order.
@MainActor
final class PaymentRecovery {
    static let shared = PaymentRecovery()

    /// How long an unpaid payment keeps being checked: a slow UPI app can still settle.
    private static let unpaidLifetime: TimeInterval = 45 * 60
    private static let pause: Duration = .seconds(20)
    /// About half an hour of checking per start; coming back to the app starts it again.
    private static let rounds = 90

    private var held: Set<String> = []
    private var loop: Task<Void, Never>?
    private var checking = false

    /// The checkout is handling this order itself right now; leave it alone.
    func hold(_ orderCode: String) { held.insert(orderCode) }
    func release(_ orderCode: String) { held.remove(orderCode) }

    /// Starts checking in the background if any payment is waiting. Safe to call often.
    func start() {
        guard loop == nil, !PendingPayments.all().isEmpty else { return }
        loop = Task { [weak self] in
            for _ in 0..<Self.rounds {
                guard let self, !Task.isCancelled else { return }
                await self.checkAll()
                if PendingPayments.all().isEmpty { break }
                try? await Task.sleep(for: Self.pause)
            }
            self?.loop = nil
        }
    }

    private func checkAll() async {
        guard !checking else { return }
        checking = true
        defer { checking = false }
        // The order is written as the signed-in shopper who paid.
        guard let uid = AuthService.shared.firebaseUID else { return }
        for payment in PendingPayments.all() where payment.userId == uid && !held.contains(payment.orderCode) {
            await recover(payment)
        }
    }

    private func recover(_ payment: PendingPayment) async {
        // Already placed (by the checkout, or an earlier round whose answer got lost).
        let placed = await FirestoreService.shared.fetchUserOrders(userId: payment.userId)
        if placed.contains(where: { $0.id == payment.orderCode }) {
            PendingPayments.remove(orderCode: payment.orderCode)
            return
        }
        guard let receipt = await OnlinePayment.shared.paidReceipt(payment.razorpayOrderId, attempts: 1) else {
            if Date().timeIntervalSince1970 - payment.startedAt > Self.unpaidLifetime {
                PendingPayments.remove(orderCode: payment.orderCode)
            }
            return
        }
        // The checkout may have taken over while the server was answering.
        guard !held.contains(payment.orderCode) else { return }
        let order = payment.makeOrder()
        do {
            try await FirestoreService.shared.createOrder(order, customer: payment.customer, distanceKm: payment.distanceKm, payment: receipt)
        } catch {
            #if DEBUG
            print("❌ [PaymentRecovery] Order write failed for \(payment.orderCode): \(error)")
            #endif
            return // paid, so it stays and is tried again next round
        }
        PendingPayments.remove(orderCode: payment.orderCode)
        orderPlaced(order)
    }

    /// What the checkout does once an order is in.
    private func orderPlaced(_ order: Order) {
        Push.shared.orderChanged(order.id)
        LocalStorage.shared.saveActiveOrderId(order.id)
        ActiveOrderStore.shared.orderPlaced(order)
        LiveActivityManager.shared.startActivity(for: order)
        OrderNotifications.requestPermissionIfNeeded()
        let cart = CartViewModel.shared
        // The cart still holds this order's items if the checkout never finished.
        if cart.items.map(\.id).sorted() == order.items.map(\.id).sorted() {
            cart.clearCart()
        }
        cart.noteOrderPlaced(order)
        HapticsManager.shared.success()
    }
}
