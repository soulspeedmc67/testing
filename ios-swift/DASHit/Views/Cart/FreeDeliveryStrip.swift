import SwiftUI

/// Free-delivery progress at the top of the cart: one line of copy over a
/// hairline bar. It never blocks checkout; under ₹299 the order just carries
/// the ₹25 fee.
struct FreeDeliveryStrip: View {
    let bill: CartBillBreakdown

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var isUnlocked: Bool { bill.subtotal >= CartBillBreakdown.freeDeliveryThreshold }
    private var progress: CGFloat { CGFloat(min(bill.subtotal / CartBillBreakdown.freeDeliveryThreshold, 1)) }

    var body: some View {
        ZStack(alignment: .leading) {
            if isUnlocked {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle")
                        .font(.system(size: 15, weight: .semibold))
                    Text("You've unlocked free delivery")
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
                            + Text(CurrencyFormatter.format(bill.amountNeededForFreeDelivery))
                                .fontWeight(.bold)
                                .foregroundColor(.textPrimary)
                            + Text(" more for free delivery").foregroundColor(.textSecondary))
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
