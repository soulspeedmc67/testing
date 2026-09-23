import SwiftUI
import MapKit

struct LiveTrackingMapView: View {
    let orderId: String
    @Environment(\.dismiss) private var dismiss
    @StateObject private var vm = LiveTrackingViewModel()
    @State private var showCancelConfirmation = false
    
    var body: some View {
        ZStack(alignment: .bottom) {
            // Full-screen Native Apple Map
            Map(position: $vm.cameraPosition) {
                // Customer Destination
                if let dest = vm.activeOrder?.deliveryAddress.coordinate {
                    Annotation("Delivery Address", coordinate: dest) {
                        ZStack {
                            Circle()
                                .fill(Color.dashitEmerald.opacity(0.3))
                                .frame(width: 48, height: 48)
                            Image(systemName: "mappin.circle.fill")
                                .font(.system(size: 32))
                                .foregroundColor(.dashitEmerald)
                        }
                    }
                }
                
                // Live Rider Scooter
                if let rider = vm.riderLocation?.coordinate {
                    Annotation("Delivery Partner", coordinate: rider) {
                        ZStack {
                            Circle()
                                .fill(Color.black)
                                .frame(width: 40, height: 40)
                                .shadow(radius: 6)
                            Image(systemName: "scooter")
                                .font(.system(size: 20))
                                .foregroundColor(.dashitEmerald)
                        }
                    }
                }
            }
            .ignoresSafeArea()
            
            // Top Nav & 60s Modify Window Badge
            VStack {
                HStack {
                    Button(action: { dismiss() }) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                            .padding(12)
                            .background(Color.black.opacity(0.7))
                            .clipShape(Circle())
                    }
                    
                    Spacer()
                    
                    // 60-Second Order Modification / Cancellation Pill
                    if vm.isModificationWindowActive {
                        HStack(spacing: 6) {
                            Image(systemName: "timer")
                                .foregroundColor(.dashitAmber)
                            Text("\(vm.secondsRemainingForModification)s to modify")
                                .font(.dashitCaptionBold)
                                .foregroundColor(.white)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.black.opacity(0.8))
                        .cornerRadius(20)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 44)
                
                Spacer()
            }
            
            // Bottom Order Tracking Card
            if let order = vm.activeOrder {
                VStack(spacing: 14) {
                    // Status Pill & ETA
                    HStack {
                        HStack(spacing: 8) {
                            Image(systemName: order.status.iconName)
                                .foregroundColor(.dashitEmerald)
                            Text(order.status.title)
                                .font(.dashitBodyBold)
                                .foregroundColor(.white)
                        }
                        
                        Spacer()
                        
                        Text("ETA \(order.etaMinutes ?? 8) MINS")
                            .font(.dashitHeadline)
                            .foregroundColor(.dashitAmber)
                    }
                    
                    // Progress Bar
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule()
                                .fill(Color.obsidianElevated)
                                .frame(height: 6)
                            Capsule()
                                .fill(Color.dashitEmerald)
                                .frame(width: geo.size.width * CGFloat(order.status.progress), height: 6)
                        }
                    }
                    .frame(height: 6)
                    
                    Divider().background(Color.obsidianBorder)
                    
                    // Items Summary
                    HStack {
                        Text("\(order.items.count) items • \(CurrencyFormatter.format(order.grandTotal))")
                            .font(.dashitCaption)
                            .foregroundColor(.gray)
                        Spacer()
                        if vm.isModificationWindowActive {
                            Button("Cancel Order") {
                                showCancelConfirmation = true
                            }
                            .font(.dashitCaptionBold)
                            .foregroundColor(.dashitRose)
                        }
                    }
                }
                .padding(16)
                .background(Color.obsidianCard)
                .cornerRadius(20)
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.obsidianBorder, lineWidth: 1)
                )
                .padding(.horizontal, 12)
                .padding(.bottom, 20)
            }
        }
        .onAppear {
            vm.startTracking(orderId: orderId)
        }
        .alert("Cancel Order?", isPresented: $showCancelConfirmation) {
            Button("Yes, Cancel", role: .destructive) {
                Task {
                    _ = await vm.cancelOrder()
                    dismiss()
                }
            }
            Button("Keep Order", role: .cancel) {}
        } message: {
            Text("Are you sure you want to cancel this order? Instant refund applies.")
        }
    }
}
