import SwiftUI

/// Centred cart pill: the last few items as stacked thumbnails, "View cart"
/// with the running total, and a chevron disc. Brand orange, as the primary
/// action on the screen.
struct FloatingCartBarView: View {
    @ObservedObject var cart = CartViewModel.shared
    var onTap: () -> Void

    var body: some View {
        ZStack {
            if !cart.items.isEmpty {
                Button {
                    HapticsManager.shared.light()
                    onTap()
                } label: {
                    pill
                }
                .buttonStyle(PressableButtonStyle(scale: 0.97))
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .frame(maxWidth: .infinity)
        .animation(.dashitSpring, value: cart.items.isEmpty)
    }

    private var pill: some View {
        HStack(spacing: 12) {
            thumbnails

            VStack(alignment: .leading, spacing: 1) {
                Text("View cart")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
                Text(subtitle)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(Color.white.opacity(0.88))
                    .monospacedDigit()
                    .contentTransition(.numericText())
                    .lineLimit(1)
            }

            Image(systemName: "chevron.right")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
                .frame(width: 36, height: 36)
                .background(Color.black.opacity(0.16), in: Circle())
                .padding(.leading, 6)
        }
        .padding(8)
        .background(Color.brandOrange, in: Capsule())
        .shadow(color: Color.black.opacity(0.4), radius: 18, x: 0, y: 8)
        .animation(.dashitSpring, value: cart.bill.grandTotal)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("View cart, \(cart.totalQuantity) items, \(CurrencyFormatter.format(cart.bill.grandTotal))")
    }

    private var subtitle: String {
        guard cart.bill.isMinOrderSatisfied else {
            return "Add \(CurrencyFormatter.format(cart.bill.amountNeededForMinOrder)) more to order"
        }
        let count = cart.totalQuantity
        return "\(count) item\(count == 1 ? "" : "s") · \(CurrencyFormatter.format(cart.bill.grandTotal))"
    }

    private var thumbnails: some View {
        HStack(spacing: -12) {
            ForEach(Array(cart.items.suffix(3).reversed())) { item in
                AsyncImage(url: URL(string: item.img)) { phase in
                    if let image = phase.image {
                        image
                            .resizable()
                            .scaledToFill()
                    } else {
                        Color.white
                    }
                }
                .frame(width: 38, height: 38)
                .background(Color.white)
                .clipShape(Circle())
                .overlay(Circle().strokeBorder(Color.brandOrange, lineWidth: 2.5))
            }
        }
    }
}
