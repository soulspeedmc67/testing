import SwiftUI

/// A slim line with a rider that moves toward free delivery as the cart grows.
/// It never blocks checkout: under ₹299 the order just carries the ₹25 fee.
struct FreeDeliveryStrip: View {
    let bill: CartBillBreakdown

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private let dotSize: CGFloat = 24
    private var isUnlocked: Bool { bill.subtotal >= CartBillBreakdown.freeDeliveryThreshold }
    private var progress: CGFloat { CGFloat(min(bill.subtotal / CartBillBreakdown.freeDeliveryThreshold, 1)) }
    private var accent: Color { isUnlocked ? .positive : .brandOrange }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            ZStack(alignment: .leading) {
                if isUnlocked {
                    HStack(spacing: 6) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 15, weight: .semibold))
                            .symbolEffect(.bounce, value: isUnlocked)
                        Text("Free delivery unlocked")
                            .font(.system(size: 13, weight: .bold))
                    }
                    .foregroundColor(.positive)
                    .transition(.asymmetric(insertion: .move(edge: .bottom).combined(with: .opacity), removal: .opacity))
                } else {
                    (Text(CurrencyFormatter.format(bill.amountNeededForFreeDelivery))
                        .font(.system(size: 13, weight: .heavy))
                        .foregroundColor(.textPrimary)
                     + Text(" away from free delivery")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.textSecondary))
                        .contentTransition(.numericText())
                        .transition(.asymmetric(insertion: .opacity, removal: .move(edge: .top).combined(with: .opacity)))
                }
            }
            .frame(height: 18, alignment: .leading)
            .clipped()

            // The rider rides a track inset by half its size, so it never overhangs the line.
            GeometryReader { geo in
                let travel = geo.size.width - dotSize
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.surfaceMuted).frame(height: 4)
                    Capsule().fill(accent).frame(width: geo.size.width * progress, height: 4)
                    Circle()
                        .fill(Color.surfaceRaised)
                        .overlay(Circle().strokeBorder(Color.hairline, lineWidth: 1))
                        .overlay(
                            Image(systemName: "scooter")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(accent)
                        )
                        .frame(width: dotSize, height: dotSize)
                        .offset(x: travel * progress)
                }
                .frame(height: dotSize)
            }
            .frame(height: dotSize)
        }
        .padding(.horizontal, 14)
        .padding(.top, 12)
        .padding(.bottom, 12)
        .dashitCard(cornerRadius: 14)
        .animation(reduceMotion ? nil : .dashitSpring, value: bill.subtotal)
        .accessibilityElement(children: .combine)
    }
}
