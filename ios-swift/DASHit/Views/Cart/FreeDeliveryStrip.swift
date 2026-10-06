import SwiftUI

/// Progress at the top of the cart: one line of copy over a hairline bar.
/// Under the shop's minimum order it counts up to that; after it, towards the
/// next, lower delivery charge. The amounts are the shop's (`ShopRules`).
struct FreeDeliveryStrip: View {
    let bill: CartBillBreakdown

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var rules: ShopRules { ShopRules.current }
    private var belowMinimum: Bool { !bill.isMinOrderSatisfied }
    private var isSmallOrder: Bool { bill.subtotal < rules.deliverySmallBelow }
    private var nextStep: Double {
        if belowMinimum { return rules.minOrderValue }
        return isSmallOrder ? rules.deliverySmallBelow : rules.deliveryLowFrom
    }
    private var nextCharge: Double { isSmallOrder ? rules.deliveryMidFee : rules.deliveryLowFee }
    private var isUnlocked: Bool {
        !belowMinimum && (bill.isFirstFivePromo || bill.subtotal >= rules.deliveryLowFrom)
    }
    private var progress: CGFloat { CGFloat(min(bill.subtotal / max(nextStep, 1), 1)) }
    /// What the bar is counting towards.
    private var goal: String {
        if belowMinimum { return " more to place your order" }
        return nextCharge > 0 ? " more for ₹\(ShopRules.whole(nextCharge)) delivery" : " more for free delivery"
    }
    private var unlockedLine: String {
        if bill.isFirstFivePromo { return "Free delivery on your first \(rules.freeDeliveryOrders) orders!" }
        return rules.deliveryLowFee > 0
            ? "Lowest ₹\(ShopRules.whole(rules.deliveryLowFee)) delivery charge on this order"
            : "Free delivery on this order"
    }

    var body: some View {
        ZStack(alignment: .leading) {
            if isUnlocked {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle")
                        .font(.system(size: 15, weight: .semibold))
                    Text(unlockedLine)
                        .font(.system(size: 13, weight: .semibold))
                    Spacer(minLength: 0)
                }
                .foregroundColor(.positive)
                .transition(.opacity.combined(with: .move(edge: .bottom)))
            } else {
                VStack(alignment: .leading, spacing: 10) {
                    HStack(spacing: 8) {
                        Image(systemName: "box.truck")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.brandOrange)
                        (Text("Add ").foregroundColor(.textSecondary)
                            + Text(CurrencyFormatter.format(max(1, nextStep - bill.subtotal)))
                                .fontWeight(.bold)
                                .foregroundColor(.textPrimary)
                            + Text(goal).foregroundColor(.textSecondary))
                            .font(.system(size: 13))
                            .contentTransition(.numericText())
                        Spacer(minLength: 0)
                    }
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(Color.surfaceMuted)
                            Capsule()
                                .fill(Color.brandOrange)
                                .frame(width: geo.size.width * progress)
                        }
                    }
                    .frame(height: 3)
                    if belowMinimum {
                        Text("We deliver orders of \(CurrencyFormatter.format(rules.minOrderValue)) or more.")
                            .font(.system(size: 12))
                            .foregroundColor(.textMuted)
                    }
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        // Keeps the swap between states inside the card's corners.
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .dashitCard(cornerRadius: 14)
        .animation(reduceMotion ? nil : .dashitSpring, value: bill.subtotal)
        .animation(reduceMotion ? nil : .dashitSpring, value: isUnlocked)
        .accessibilityElement(children: .combine)
    }
}
