import SwiftUI

struct CartSheetView: View {
    @ObservedObject var cart = CartViewModel.shared
    @Environment(\.dismiss) private var dismiss
    @State private var isCheckoutOpen = false
    @State private var isCouponsOpen = false

    private var cardShape: RoundedRectangle { RoundedRectangle(cornerRadius: 14, style: .continuous) }

    var body: some View {
        NavigationStack {
            Group {
                if cart.items.isEmpty {
                    emptyState
                } else {
                    cartContent
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.surface.ignoresSafeArea())
            .navigationTitle("Your Cart")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.surface, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") { dismiss() }
                        .foregroundColor(.brandAccent)
                }
            }
            .sheet(isPresented: $isCheckoutOpen) {
                CheckoutView()
            }
            .sheet(isPresented: $isCouponsOpen) {
                CouponsSheetView()
                    .dashitSheet([.fraction(0.85), .large])
            }
            .task {
                #if DEBUG
                if ScreenshotHooks.openCoupons {
                    try? await Task.sleep(for: .seconds(1))
                    isCouponsOpen = true
                }
                #endif
            }
        }
    }

    // MARK: - Empty

    private var emptyState: some View {
        VStack(spacing: 10) {
            Image(systemName: "bag")
                .font(.system(size: 48, weight: .light))
                .foregroundColor(.textFaint)
            Text("Your cart is empty")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.textPrimary)
                .padding(.top, 6)
            Text("Explore fresh groceries delivered in 8 mins.")
                .font(.system(size: 14))
                .foregroundColor(.textMuted)
            Button {
                dismiss()
            } label: {
                Text("Start shopping")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 24)
                    .frame(height: 46)
                    .background(Color.brandOrange, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            .buttonStyle(.pressable)
            .padding(.top, 10)
        }
        .padding(24)
    }

    // MARK: - Cart

    private var cartContent: some View {
        ScrollView {
            VStack(spacing: 14) {
                if cart.bill.subtotal > 0 {
                    FreeDeliveryStrip(bill: cart.bill)
                }
                itemsCard
                couponRow
                billCard
            }
            .padding(16)
            .animation(.dashitSpring, value: cart.items)
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            proceedBar
        }
    }

    private var itemsCard: some View {
        VStack(spacing: 0) {
            ForEach(Array(cart.items.enumerated()), id: \.element.id) { index, item in
                if index > 0 {
                    Rectangle()
                        .fill(Color.hairline)
                        .frame(height: 1)
                        .padding(.leading, 76)
                }
                CartLineRow(item: item)
                    .transition(.opacity.combined(with: .scale(scale: 0.96)))
            }
        }
        .dashitCard(cardShape)
    }

    /// Coupons: the best code for this cart one tap away, or what the applied
    /// code is saving, with the full list behind "View all coupons".
    private var couponRow: some View {
        let bill = cart.bill
        let best = Coupon.best(forSubtotal: bill.subtotal)

        return VStack(spacing: 0) {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(cart.appliedCoupon != nil ? Color.positive : Color.brandOrange)
                        .frame(width: 34, height: 34)
                    Image(systemName: cart.appliedCoupon != nil ? "checkmark" : "percent")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                }

                if let coupon = cart.appliedCoupon {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("\(coupon.code) applied")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.textPrimary)
                        Text(bill.couponDiscount > 0
                             ? "You're saving \(CurrencyFormatter.format(bill.couponDiscount)) on this order"
                             : "Delivery fee waived")
                            .font(.system(size: 12))
                            .foregroundColor(.positive)
                    }
                    Spacer(minLength: 8)
                    Button("Remove") {
                        cart.removeCoupon()
                    }
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.danger)
                    .buttonStyle(.pressable)
                } else if let best {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Save \(CurrencyFormatter.format(best.saving(onSubtotal: bill.subtotal))) with \(best.code)")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.textPrimary)
                        Text(best.title)
                            .font(.system(size: 12))
                            .foregroundColor(.textMuted)
                            .lineLimit(1)
                    }
                    Spacer(minLength: 8)
                    Button {
                        cart.applyCoupon(best)
                    } label: {
                        Text("APPLY")
                            .font(.system(size: 13, weight: .heavy))
                            .foregroundColor(.brandAccent)
                            .padding(.horizontal, 12)
                            .frame(height: 32)
                            .overlay(Capsule().strokeBorder(Color.brandOrange.opacity(0.6), lineWidth: 1))
                    }
                    .buttonStyle(.pressable)
                } else {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Apply a coupon")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.textPrimary)
                        Text("\(Coupon.catalog.count) offers available")
                            .font(.system(size: 12))
                            .foregroundColor(.textMuted)
                    }
                    Spacer(minLength: 8)
                }
            }
            .padding(14)

            Rectangle()
                .fill(Color.hairline)
                .frame(height: 1)
                .padding(.leading, 60)

            Button {
                HapticsManager.shared.light()
                isCouponsOpen = true
            } label: {
                HStack {
                    Text("View all coupons")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.textSecondary)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.textFaint)
                }
                .padding(.leading, 60)
                .padding(.trailing, 14)
                .frame(height: 44)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
        .dashitCard(cardShape)
        .animation(.dashitSpring, value: cart.appliedCoupon?.code)
    }

    private var billCard: some View {
        let bill = cart.bill

        return VStack(spacing: 10) {
            HStack {
                Text("Bill details")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.textPrimary)
                Spacer()
            }
            billRow("Item total", value: CurrencyFormatter.format(bill.subtotal))
            billRow(
                "Delivery partner fee",
                value: bill.deliveryFee == 0 ? "FREE" : CurrencyFormatter.format(bill.deliveryFee),
                valueColor: bill.deliveryFee == 0 ? .positive : .textPrimary
            )
            if bill.couponDiscount > 0 {
                billRow("Coupon discount", value: "-\(CurrencyFormatter.format(bill.couponDiscount))", valueColor: .positive)
            }
            Rectangle()
                .fill(Color.hairline)
                .frame(height: 1)
            HStack {
                Text("To pay")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.textPrimary)
                Spacer()
                Text(CurrencyFormatter.format(bill.grandTotal))
                    .font(.system(size: 17, weight: .bold, design: .rounded))
                    .foregroundColor(.textPrimary)
                    .contentTransition(.numericText(value: bill.grandTotal))
            }
        }
        .padding(14)
        .dashitCard(cardShape)
        .animation(.dashitSpring, value: bill.grandTotal)
    }

    private func billRow(_ label: String, value: String, valueColor: Color = .textPrimary) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 13))
                .foregroundColor(.textMuted)
            Spacer()
            Text(value)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(valueColor)
                .contentTransition(.numericText())
        }
    }

    private var proceedBar: some View {
        let bill = cart.bill

        return VStack(spacing: 0) {
            Rectangle()
                .fill(Color.hairline)
                .frame(height: 1)
            Button {
                HapticsManager.shared.medium()
                isCheckoutOpen = true
            } label: {
                HStack(spacing: 8) {
                    VStack(alignment: .leading, spacing: 1) {
                        Text(CurrencyFormatter.format(bill.grandTotal))
                            .font(.system(size: 17, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                            .contentTransition(.numericText(value: bill.grandTotal))
                        Text("TOTAL")
                            .font(.system(size: 10, weight: .bold))
                            .tracking(0.6)
                            .foregroundColor(Color.white.opacity(0.75))
                    }
                    Spacer()
                    Text("Proceed to checkout")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                    Image(systemName: "arrow.right")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.white)
                }
                .padding(.horizontal, 18)
                .frame(height: 58)
                .background(
                    Color.brandOrange,
                    in: RoundedRectangle(cornerRadius: 16, style: .continuous)
                )
            }
            .buttonStyle(PressableButtonStyle(scale: 0.98))
            .padding(.horizontal, 16)
            .padding(.top, 10)
            .padding(.bottom, 8)
        }
        .background(Color.surface.ignoresSafeArea(edges: .bottom))
        .animation(.dashitSpring, value: bill.grandTotal)
    }
}

/// One cart line with its own stepper.
private struct CartLineRow: View {
    let item: CartItem
    @ObservedObject private var cart = CartViewModel.shared

    var body: some View {
        HStack(spacing: 12) {
            AsyncImage(url: URL(string: item.img)) { phase in
                if let image = phase.image {
                    image
                        .resizable()
                        .scaledToFill()
                } else if phase.error == nil && !item.img.isEmpty {
                    ShimmerView()
                } else {
                    Color.surfaceMuted
                }
            }
            .frame(width: 52, height: 52)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

            VStack(alignment: .leading, spacing: 3) {
                Text(item.name)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.textPrimary)
                    .lineLimit(2)
                Text(item.unit)
                    .font(.system(size: 12))
                    .foregroundColor(.textMuted)
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text(CurrencyFormatter.format(item.price * Double(item.qty)))
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundColor(.textPrimary)
                        .contentTransition(.numericText(value: item.price * Double(item.qty)))
                    if let original = item.originalPrice, original > item.price {
                        Text(CurrencyFormatter.format(original * Double(item.qty)))
                            .font(.system(size: 12))
                            .foregroundColor(.textFaint)
                            .strikethrough(true, color: .textFaint)
                    }
                }
            }

            Spacer(minLength: 8)

            QuantityStepper(
                quantity: item.qty,
                onAdd: { cart.increment(itemId: item.id) },
                onIncrement: { cart.increment(itemId: item.id) },
                onDecrement: { cart.decrement(itemId: item.id) }
            )
        }
        .padding(12)
    }
}
