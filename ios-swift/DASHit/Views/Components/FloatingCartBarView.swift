import SwiftUI

struct FloatingCartBarView: View {
    @ObservedObject var cart = CartViewModel.shared
    var onTap: () -> Void
    
    var body: some View {
        if !cart.items.isEmpty {
            Button(action: {
                HapticsManager.shared.medium()
                onTap()
            }) {
                HStack(spacing: 12) {
                    // Item Counter Badge
                    HStack(spacing: 6) {
                        Image(systemName: "cart.fill")
                            .font(.system(size: 14))
                            .foregroundColor(.white)
                        
                        let totalQty = cart.items.reduce(0) { $0 + $1.qty }
                        Text("\(totalQty) ITEMS")
                            .font(.dashitCaptionBold)
                            .foregroundColor(.white)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color.white.opacity(0.15))
                    .cornerRadius(8)
                    
                    VStack(alignment: .leading, spacing: 1) {
                        Text(CurrencyFormatter.format(cart.bill.grandTotal))
                            .font(.dashitTitle)
                            .foregroundColor(.white)
                        
                        Text("TOTAL")
                            .font(.dashitMicro)
                            .foregroundColor(Color.white.opacity(0.8))
                    }
                    
                    Spacer()
                    
                    // View Cart Button
                    HStack(spacing: 6) {
                        Text("View Cart")
                            .font(.dashitBodyBold)
                            .foregroundColor(.white)
                        Image(systemName: "arrow.right")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.white)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(
                    LinearGradient(
                        colors: [Color.dashitEmerald, Color.dashitEmeraldDark],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .clipShape(Capsule())
                .shadow(color: Color.dashitEmerald.opacity(0.4), radius: 12, x: 0, y: 6)
            }
            .padding(.horizontal, 16)
            .transition(.move(edge: .bottom).combined(with: .opacity))
        }
    }
}
