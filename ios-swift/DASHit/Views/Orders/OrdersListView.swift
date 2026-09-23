import SwiftUI
import FirebaseFirestore

struct OrdersListView: View {
    @ObservedObject private var auth = AuthService.shared
    @State private var orders: [Order] = []
    @State private var selectedOrderId: String?
    @State private var isTrackingOpen = false
    private var orderListener: ListenerRegistration?
    
    var body: some View {
        NavigationStack {
            ZStack {
                Color.surface.ignoresSafeArea()
                
                if !auth.isAuthenticated {
                    VStack(spacing: 12) {
                        Image(systemName: "bag")
                            .font(.system(size: 50))
                            .foregroundColor(.textMuted)
                        Text("Log In to View Orders")
                            .font(.dashitHeadline)
                            .foregroundColor(.white)
                        Text("Your order history and active delivery tracking will appear here.")
                            .font(.dashitCaption)
                            .foregroundColor(.textMuted)
                            .multilineTextAlignment(.center)
                    }
                    .padding(24)
                } else if orders.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "shippingbox")
                            .font(.system(size: 50))
                            .foregroundColor(.textMuted)
                        Text("No Orders Placed Yet")
                            .font(.dashitHeadline)
                            .foregroundColor(.white)
                        Text("When you order fresh groceries, you can track them in real time here.")
                            .font(.dashitCaption)
                            .foregroundColor(.textMuted)
                    }
                    .padding(24)
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(orders) { order in
                                Button(action: {
                                    selectedOrderId = order.id
                                    isTrackingOpen = true
                                    HapticsManager.shared.light()
                                }) {
                                    VStack(alignment: .leading, spacing: 10) {
                                        HStack {
                                            HStack(spacing: 6) {
                                                Image(systemName: order.status.iconName)
                                                    .foregroundColor(.brandAccent)
                                                Text(order.status.title)
                                                    .font(.dashitBodyBold)
                                                    .foregroundColor(.white)
                                            }
                                            Spacer()
                                            Text(CurrencyFormatter.format(order.grandTotal))
                                                .font(.dashitHeadline)
                                                .foregroundColor(.white)
                                        }
                                        
                                        Text("\(order.items.count) items • \(order.items.map { $0.name }.joined(separator: ", "))")
                                            .font(.dashitCaption)
                                            .foregroundColor(.textMuted)
                                            .lineLimit(1)
                                        
                                        HStack {
                                            Text("Order #\(order.id.suffix(6))")
                                                .font(.dashitMicro)
                                                .foregroundColor(.textMuted)
                                            Spacer()
                                            Text(order.status == .delivered ? "Delivered" : "Track Live Arrival →")
                                                .font(.dashitCaptionBold)
                                                .foregroundColor(order.status == .delivered ? .gray : .brandOrange)
                                        }
                                    }
                                    .padding(14)
                                    .background(Color.surfaceRaised)
                                    .cornerRadius(12)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(Color.hairline, lineWidth: 1)
                                    )
                                }
                            }
                        }
                        .padding(16)
                    }
                }
            }
            .navigationTitle("Your Orders")
            .navigationBarTitleDisplayMode(.inline)
            .fullScreenCover(isPresented: $isTrackingOpen) {
                if let orderId = selectedOrderId {
                    LiveTrackingMapView(orderId: orderId)
                }
            }
        }
    }
}
