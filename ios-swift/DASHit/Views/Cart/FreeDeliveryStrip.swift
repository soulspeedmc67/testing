import SwiftUI

/// Free-delivery progress at the top of the cart: one line of copy over a
/// hairline bar. It never blocks checkout; under ₹299 the order just carries
/// the ₹25 fee.
struct FreeDeliveryStrip: View {
    let bill: CartBillBreakdown

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    // Delivery is never free by amount: the bar counts towards the next, lower
    // charge (₹35 from ₹180, ₹25 above ₹299).
    private var nextStep: Double { bill.subtotal < 180 ? 180 : 300 }
    private var nextCharge: Int { bill.subtotal < 180 ? 35 : 25 }
    private var isUnlocked: Bool { bill.isFirstFivePromo || bill.subtotal > CartBillBreakdown.freeDeliveryThreshold }
    private var progress: CGFloat { CGFloat(min(bill.subtotal / nextStep, 1)) }

    var body: some View {
        ZStack(alignment: .leading) {
            if isUnlocked {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle")
                        .font(.system(size: 15, weight: .semibold))
                    Text(bill.isFirstFivePromo ? "Free delivery on your first 5 orders!" : "Lowest ₹25 delivery charge on this order")
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
                            + Text(" more for ₹\(nextCharge) delivery").foregroundColor(.textSecondary))
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
