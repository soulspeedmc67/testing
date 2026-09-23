import SwiftUI

/// Centred midnight cart pill, matching the web FloatingCartBar: the last few
/// items as stacked thumbnails, then "View cart" with the running total.
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
        HStack(spacing: 10) {
            thumbnails

            VStack(alignment: .leading, spacing: 1) {
                Text("View cart")
                    .font(.system(size: 14, weight: .heavy))
                    .foregroundColor(.white)
                if cart.bill.isMinOrderSatisfied {
                    Text("\(cart.totalQuantity) item\(cart.totalQuantity == 1 ? "" : "s") · \(CurrencyFormatter.format(cart.bill.grandTotal))")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(Color.white.opacity(0.75))
                        .monospacedDigit()
                        .contentTransition(.numericText())
                } else {
                    Text("Add \(CurrencyFormatter.format(cart.bill.amountNeededForMinOrder)) more to order")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.caution)
                        .monospacedDigit()
                        .contentTransition(.numericText())
                }
            }

            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(Color.white.opacity(0.9))
                .padding(.leading, 4)
        }
        .padding(.leading, 6)
        .padding(.trailing, 16)
        .padding(.vertical, 6)
        .background(Color.midnight, in: Capsule())
        .overlay(Capsule().strokeBorder(Color.white.opacity(0.12), lineWidth: 1))
        .shadow(color: Color.black.opacity(0.35), radius: 14, x: 0, y: 6)
        .animation(.dashitSpring, value: cart.bill.grandTotal)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("View cart, \(cart.totalQuantity) items, \(CurrencyFormatter.format(cart.bill.grandTotal))")
    }

    private var thumbnails: some View {
        HStack(spacing: -10) {
            ForEach(Array(cart.items.suffix(3).reversed())) { item in
                AsyncImage(url: URL(string: item.img)) { phase in
                    if let image = phase.image {
                        image
                            .resizable()
                            .scaledToFill()
                    } else {
                        Color.surfaceMuted
                    }
                }
                .frame(width: 32, height: 32)
                .clipShape(Circle())
                .overlay(Circle().strokeBorder(Color.midnight, lineWidth: 2))
            }
        }
    }
}
