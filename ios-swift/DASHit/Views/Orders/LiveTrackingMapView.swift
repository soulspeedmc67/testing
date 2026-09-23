import SwiftUI
import MapKit

struct LiveTrackingMapView: View {
    let orderId: String
    var initialOrder: Order? = nil
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
                                .fill(Color.brandOrange.opacity(0.3))
                                .frame(width: 48, height: 48)
                            Image(systemName: "mappin.circle.fill")
                                .font(.system(size: 32))
                                .foregroundColor(.brandAccent)
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
                                .foregroundColor(.brandAccent)
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
                                .foregroundColor(.caution)
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
                .padding(.top, 8)
                
                Spacer()
            }
            
            // Bottom Order Tracking Card
            if let order = vm.activeOrder {
                VStack(spacing: 14) {
                    // Status Pill & ETA
                    HStack {
                        HStack(spacing: 8) {
                            Image(systemName: order.status.iconName)
                                .foregroundColor(.brandAccent)
                            Text(order.status.stage.headline(riderName: order.driverName))
                                .font(.dashitBodyBold)
                                .foregroundColor(.white)
                                .lineLimit(1)
                        }
                        
                        Spacer()
                        
                        if !order.status.stage.isFinished {
                            Text("ETA \(order.etaMinutes ?? 8) MINS")
                                .font(.dashitHeadline)
                                .foregroundColor(.brandAccent)
                        }
                    }
                    
                    OrderProgressRail(stage: order.status.stage)

                    Rectangle()
                        .fill(Color.hairline)
                        .frame(height: 1)
                    
                    // Items Summary
                    HStack {
                        let units = order.items.reduce(0) { $0 + $1.qty }
                        Text("\(units) item\(units == 1 ? "" : "s") • \(CurrencyFormatter.format(order.grandTotal))")
                            .font(.dashitCaption)
                            .foregroundColor(.textMuted)
                        Spacer()
                        if vm.isModificationWindowActive {
                            Button("Cancel Order") {
                                showCancelConfirmation = true
                            }
                            .font(.dashitCaptionBold)
                            .foregroundColor(.danger)
                        }
                    }
                }
                .padding(16)
                .background(Color.surfaceRaised)
                .cornerRadius(20)
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.hairline, lineWidth: 1)
                )
                .padding(.horizontal, 12)
                .padding(.bottom, 20)
            } else {
                // Never leave a bare map: say what is happening until the order loads.
                HStack(spacing: 12) {
                    ProgressView()
                        .tint(.white)
                    Text("Loading your order…")
                        .font(.dashitBodyBold)
                        .foregroundColor(.white)
                    Spacer()
                }
                .padding(16)
                .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(Color.hairline, lineWidth: 1))
                .padding(.horizontal, 12)
                .padding(.bottom, 20)
            }
        }
        .onAppear {
            vm.startTracking(orderId: orderId, initialOrder: initialOrder)
        }
        .animation(.dashitSpring, value: vm.activeOrder?.status)
        .confirmationDialog("Cancel this order?", isPresented: $showCancelConfirmation, titleVisibility: .visible) {
            Button("Yes, cancel order", role: .destructive) {
                Task {
                    if await vm.cancelOrder() {
                        dismiss()
                    } else {
                        HapticsManager.shared.error()
                    }
                }
            }
            Button("Keep order", role: .cancel) {}
        } message: {
            Text("The store will stop preparing it straight away.")
        }
    }
}
