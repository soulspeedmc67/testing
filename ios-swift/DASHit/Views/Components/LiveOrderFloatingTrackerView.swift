import SwiftUI

/// Floating live order tracker pill docked above the bottom tab bar
struct LiveOrderFloatingTrackerView: View {
    let order: Order
    var onTap: () -> Void
    
    var body: some View {
        Button(action: {
            HapticsManager.shared.medium()
            onTap()
        }) {
            HStack(spacing: 12) {
                // Pulse Indicator & Status Icon
                ZStack {
                    Circle()
                        .fill(Color.dashitEmerald.opacity(0.2))
                        .frame(width: 38, height: 38)
                    Image(systemName: order.status.iconName)
                        .font(.system(size: 18))
                        .foregroundColor(.dashitEmerald)
                }
                
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(order.status.title)
                            .font(.dashitBodyBold)
                            .foregroundColor(.white)
                        
                        Circle()
                            .fill(Color.dashitEmerald)
                            .frame(width: 5, height: 5)
                        
                        Text("ETA \(order.etaMinutes ?? 8)m")
                            .font(.dashitCaptionBold)
                            .foregroundColor(.dashitAmber)
                    }
                    
                    Text("\(order.items.count) items • \(order.deliveryAddress.nickname)")
                        .font(.dashitMicro)
                        .foregroundColor(.gray)
                }
                
                Spacer()
                
                // Track Arrow Pill
                HStack(spacing: 4) {
                    Text("Track")
                        .font(.dashitCaptionBold)
                        .foregroundColor(.dashitEmerald)
                    Image(systemName: "chevron.right")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.dashitEmerald)
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(Color.dashitEmerald.opacity(0.12))
                .cornerRadius(12)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(Color.obsidianElevated)
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color.obsidianBorder, lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.5), radius: 10, x: 0, y: 4)
        }
        .padding(.horizontal, 16)
        .transition(.move(edge: .bottom).combined(with: .opacity))
    }
}
