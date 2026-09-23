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
                // The way the rider comes: the road route, or a dashed line
                // straight to the door when Apple Maps has none.
                if let route = vm.route {
                    MapPolyline(route.polyline)
                        .stroke(Color.brandOrange, style: StrokeStyle(lineWidth: 5, lineCap: .round, lineJoin: .round))
                } else if vm.fallbackPath.count == 2 {
                    MapPolyline(coordinates: vm.fallbackPath)
                        .stroke(Color.brandOrange, style: StrokeStyle(lineWidth: 4, lineCap: .round, dash: [6, 8]))
                }

                // Dark store the order is packed at.
                Annotation("DASHit hub", coordinate: DeliveryEta.hub) {
                    Image(systemName: "storefront.fill")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.white)
                        .frame(width: 30, height: 30)
                        .background(Circle().fill(Color.midnight))
                        .overlay(Circle().strokeBorder(Color.white, lineWidth: 2))
                        .shadow(color: .black.opacity(0.25), radius: 4, x: 0, y: 2)
                }

                // Customer destination
                if let dest = vm.activeOrder?.deliveryAddress.coordinate {
                    Annotation("Delivery address", coordinate: dest, anchor: .bottom) {
                        DestinationMapMarker()
                    }
                }

                // Live rider, drawn with the branded rider artwork
                if let rider = vm.riderLocation {
                    Annotation("Delivery partner", coordinate: rider.coordinate, anchor: .center) {
                        RiderMapMarker(
                            tracking: rider,
                            destination: vm.activeOrder?.deliveryAddress.coordinate
                        )
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
                            Text("ETA \(vm.riderLocation?.etaMinutes ?? order.etaMinutes ?? 8) MINS")
                                .font(.dashitHeadline)
                                .foregroundColor(.brandAccent)
                                .contentTransition(.numericText())
                        }
                    }

                    if order.status.stage == .onTheWay, let line = vm.riderLocation?.statusText ?? vm.riderLocation?.distanceFormatted {
                        Text(line)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(Color.white.opacity(0.75))
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    OrderProgressRail(stage: order.status.stage, progress: order.status.stage.progress(live: vm.riderLocation?.progress))

                    Rectangle()
                        .fill(Color.white.opacity(0.1))
                        .frame(height: 1)

                    // Items Summary
                    HStack {
                        let units = order.items.reduce(0) { $0 + $1.qty }
                        Text("\(units) item\(units == 1 ? "" : "s") • \(CurrencyFormatter.format(order.grandTotal))")
                            .font(.dashitCaption)
                            .foregroundColor(Color.white.opacity(0.6))
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
                // The web tracker's plain black panel in both themes; the
                // progress rail is drawn for a dark surface.
                .background(Color.trackerCard, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 22, style: .continuous).strokeBorder(Color.white.opacity(0.1), lineWidth: 1))
                .environment(\.colorScheme, .dark)
                .shadow(color: .floatingShadow, radius: 18, x: 0, y: 8)
                .padding(.horizontal, 12)
                .padding(.bottom, 20)
            } else {
                // Never leave a bare map: say what is happening until the order loads.
                HStack(spacing: 12) {
                    ProgressView()
                        .tint(.brandOrange)
                    Text("Loading your order…")
                        .font(.dashitBodyBold)
                        .foregroundColor(.textPrimary)
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
