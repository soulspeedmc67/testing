import SwiftUI
import MapKit

struct LiveTrackingMapView: View {
    let orderId: String
    var initialOrder: Order? = nil
    @Environment(\.dismiss) private var dismiss
    @StateObject private var vm = LiveTrackingViewModel()
    @State private var showCancelConfirmation = false
    @State private var isAddItemsOpen = false
    @State private var isCancelling = false

    var body: some View {
        Group {
            // The map only once a rider has the order: before that there's
            // nothing to follow, so received and packing get their own screens.
            if let stage = shownOrder?.status.stage, Self.showsMap(stage) {
                mapScreen
                    .transition(.opacity)
            } else {
                stageScreen(shownOrder)
                    .transition(.opacity)
            }
        }
        .onAppear {
            vm.startTracking(orderId: orderId, initialOrder: initialOrder)
        }
        .animation(.dashitSpring, value: vm.activeOrder?.status)
        .animation(.dashitSpring, value: vm.isModificationWindowActive)
        .sheet(isPresented: $isAddItemsOpen) {
            if let order = vm.activeOrder {
                AddItemsSheet(order: order) { replacement in
                    vm.switchTo(order: replacement)
                }
            }
        }
        .confirmationDialog("Cancel this order?", isPresented: $showCancelConfirmation, titleVisibility: .visible) {
            Button("Cancel and keep items in cart", role: .destructive) {
                cancel(restoreCart: true)
            }
            Button("Cancel order", role: .destructive) {
                cancel(restoreCart: false)
            }
            Button("Keep order", role: .cancel) {}
        } message: {
            Text("The store will stop preparing it straight away.")
        }
    }

    private var shownOrder: Order? { vm.activeOrder ?? initialOrder }

    static func showsMap(_ stage: DeliveryStage) -> Bool {
        stage == .onTheWay || stage == .delivered
    }

    // MARK: - Received and packing

    /// One calm, dark screen for "received" and "packing": the DASHit tile
    /// animating in the middle, what's happening in a line, then the order.
    private func stageScreen(_ order: Order?) -> some View {
        VStack(spacing: 0) {
            HStack {
                Button(action: { dismiss() }) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                        .frame(width: 42, height: 42)
                        .background(Color.white.opacity(0.1), in: Circle())
                }
                .buttonStyle(PressableButtonStyle(scale: 0.9))
                .accessibilityLabel("Back")

                Spacer()

                if let order {
                    Text("Order #\(order.id.suffix(6))")
                        .font(.system(size: 13, weight: .semibold, design: .monospaced))
                        .foregroundColor(Color.white.opacity(0.55))
                }

                Spacer()

                if vm.isModificationWindowActive, let order {
                    countdownPill(order)
                } else {
                    Color.clear.frame(width: 42, height: 42)
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)

            ScrollView {
                VStack(spacing: 22) {
                    if let order {
                        OrderStageHero(stage: order.status.stage, canStillChange: vm.isModificationWindowActive)
                            .padding(.top, 6)
                        orderCard(order)
                        itemsList(order)
                    } else {
                        TrackingCardSkeleton()
                            .padding(.top, 40)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 28)
            }
        }
        .background(Color.midnight.ignoresSafeArea())
        .environment(\.colorScheme, .dark)
    }

    private func countdownPill(_ order: Order) -> some View {
        HStack(spacing: 6) {
            ModifyCountdownBadge(order: order)
            Text("to change")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.white)
        }
        .padding(.horizontal, 12)
        .frame(height: 38)
        .background(Color.black.opacity(0.78), in: Capsule())
        .transition(.opacity.combined(with: .scale(scale: 0.9)))
    }

    private func itemsList(_ order: Order) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(order.status.stage == .packing ? "Being packed" : "Your items")
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(.textPrimary)
                .padding(.bottom, 6)
            ForEach(Array(order.items.enumerated()), id: \.offset) { index, item in
                HStack(spacing: 12) {
                    AsyncImage(url: URL(string: item.img)) { phase in
                        if let image = phase.image {
                            image.resizable().scaledToFit().padding(3)
                        } else {
                            Color.surfaceMuted
                        }
                    }
                    .frame(width: 42, height: 42)
                    .background(Color.white, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    .accessibilityHidden(true)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.name)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.textPrimary)
                            .lineLimit(2)
                        Text("\(item.unit) · ×\(item.qty)")
                            .font(.system(size: 12))
                            .foregroundColor(.textMuted)
                    }
                    Spacer(minLength: 8)
                    Text(CurrencyFormatter.format(item.price * Double(item.qty)))
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.textPrimary)
                }
                .padding(.vertical, 8)
                if index < order.items.count - 1 {
                    Rectangle().fill(Color.white.opacity(0.08)).frame(height: 1)
                }
            }
        }
        .padding(16)
        .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(Color.white.opacity(0.08), lineWidth: 1))
    }

    // MARK: - Out for delivery

    private var mapScreen: some View {
        ZStack(alignment: .bottom) {
            map

            // Back button and the change-window countdown
            VStack {
                HStack {
                    Button(action: { dismiss() }) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                            .frame(width: 42, height: 42)
                            .background(Color.black.opacity(0.72), in: Circle())
                    }
                    .buttonStyle(PressableButtonStyle(scale: 0.9))
                    .accessibilityLabel("Back")

                    Spacer()

                    if vm.isModificationWindowActive, let order = vm.activeOrder {
                        countdownPill(order)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)

                Spacer()
            }

            if let order = shownOrder {
                orderCard(order)
                    .padding(.horizontal, 12)
                    .padding(.bottom, 20)
            } else {
                // Never leave a bare map: the card's skeleton until the order loads.
                TrackingCardSkeleton()
                    .padding(.horizontal, 12)
                    .padding(.bottom, 20)
                    .transition(.opacity)
            }
        }
    }

    // MARK: - Map

    private var map: some View {
        Map(position: $vm.cameraPosition) {
            // The way the rider comes, along the roads: an orange line on a
            // dark casing so it reads on both map themes. A faint dashed
            // straight line only stands in until the route arrives.
            if vm.routePath.count > 1 {
                if vm.isRoadRoute {
                    MapPolyline(coordinates: vm.routePath)
                        .stroke(Color.black.opacity(0.35), style: StrokeStyle(lineWidth: 9, lineCap: .round, lineJoin: .round))
                    MapPolyline(coordinates: vm.routePath)
                        .stroke(Color.brandOrange, style: StrokeStyle(lineWidth: 5, lineCap: .round, lineJoin: .round))
                } else {
                    MapPolyline(coordinates: vm.routePath)
                        .stroke(Color.brandOrange.opacity(0.55), style: StrokeStyle(lineWidth: 3, lineCap: .round, dash: [4, 8]))
                }
            }

            // Dark store the order is packed at, marked with the app icon.
            Annotation("DASHit hub", coordinate: DeliveryEta.hub) {
                BrandMapMarker(size: 34)
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
    }

    // MARK: - Order card

    private func orderCard(_ order: Order) -> some View {
        let stage = order.status.stage
        let units = order.items.reduce(0) { $0 + $1.qty }

        return VStack(spacing: 14) {
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: order.status.iconName)
                        .foregroundColor(.brandAccent)
                    Text(stage.headline(riderName: order.driverName))
                        .font(.dashitBodyBold)
                        .foregroundColor(.white)
                        .lineLimit(1)
                }
                Spacer()
                // The arrival time only once a rider has the order and is on the way.
                if stage == .onTheWay {
                    Text("ETA \(vm.riderLocation?.etaMinutes ?? order.etaMinutes ?? 8) MINS")
                        .font(.dashitHeadline)
                        .foregroundColor(.brandAccent)
                        .contentTransition(.numericText())
                }
            }

            if stage == .onTheWay, let line = vm.riderLocation?.statusText ?? vm.riderLocation?.distanceFormatted {
                Text(line)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(Color.white.opacity(0.75))
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            OrderProgressRail(stage: stage, progress: stage.progress(live: vm.riderLocation?.progress))

            if !stage.isFinished, let code = order.otp, !code.isEmpty {
                DeliveryCodeRow(code: code)
            }

            if vm.isModificationWindowActive {
                changeWindowRow(order)
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
            }

            Rectangle()
                .fill(Color.white.opacity(0.1))
                .frame(height: 1)

            HStack {
                Text("\(units) item\(units == 1 ? "" : "s") • \(CurrencyFormatter.format(order.grandTotal))")
                    .font(.dashitCaption)
                    .foregroundColor(Color.white.opacity(0.6))
                Spacer()
                Text("#\(order.id.suffix(6))")
                    .font(.system(size: 12, weight: .medium, design: .monospaced))
                    .foregroundColor(Color.white.opacity(0.45))
            }
        }
        .padding(16)
        // The web tracker's plain black panel in both themes; the progress
        // rail is drawn for a dark surface.
        .background(Color.trackerCard, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 24, style: .continuous).strokeBorder(Color.white.opacity(0.1), lineWidth: 1))
        .environment(\.colorScheme, .dark)
        .shadow(color: .floatingShadow, radius: 18, x: 0, y: 8)
    }

    /// While the order can still change: add more items or cancel.
    private func changeWindowRow(_ order: Order) -> some View {
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Forgot something?")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)
                Text("Add or cancel before packing")
                    .font(.system(size: 12))
                    .foregroundColor(Color.white.opacity(0.6))
                    .lineLimit(1)
                    .minimumScaleFactor(0.85)
            }
            Spacer(minLength: 6)
            Button {
                HapticsManager.shared.light()
                showCancelConfirmation = true
            } label: {
                Text(isCancelling ? "…" : "Cancel")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.danger)
                    .fixedSize()
                    .padding(.horizontal, 12)
                    .frame(height: 34)
                    .background(Color.white.opacity(0.08), in: Capsule())
            }
            .buttonStyle(.pressable)
            .disabled(isCancelling)
            Button {
                HapticsManager.shared.light()
                isAddItemsOpen = true
            } label: {
                Label("Add items", systemImage: "plus")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(1)
                    .fixedSize()
                    .padding(.horizontal, 12)
                    .frame(height: 34)
                    .background(Color.brandOrange, in: Capsule())
            }
            .buttonStyle(.pressable)
        }
        .padding(12)
        .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func cancel(restoreCart: Bool) {
        isCancelling = true
        Task {
            if await vm.cancelOrder(restoreCart: restoreCart) {
                dismiss()
            }
            isCancelling = false
        }
    }
}

/// Top of the received and packing screens: a line-art icon that keeps
/// animating (a receipt filling in, then a box being packed), and what's
/// happening in plain words. Driven by a timeline from when the screen opened,
/// so it starts from the beginning and never stutters when the order updates.
private struct OrderStageHero: View {
    let stage: DeliveryStage
    let canStillChange: Bool

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var openedAt = Date()

    private var title: String {
        switch stage {
        case .placed: return "Order received"
        case .packing: return "Packing your order"
        case .cancelled: return "Order cancelled"
        default: return stage.headline(riderName: nil)
        }
    }

    private var subtitle: String {
        switch stage {
        case .placed:
            return canStillChange
                ? "You can still add items or cancel. Packing starts right after."
                : "The store is getting your items ready."
        case .packing:
            return "Your items are being picked and packed. The map opens as soon as a rider is on the way."
        case .cancelled:
            return "This order won't be delivered."
        default:
            return ""
        }
    }

    private var iconKind: OrderStageIcon.Kind? {
        switch stage {
        case .placed: return .received
        case .packing: return .packing
        default: return nil
        }
    }

    var body: some View {
        VStack(spacing: 20) {
            Group {
                if let kind = iconKind {
                    if reduceMotion {
                        OrderStageIcon(kind: kind, time: OrderStageIcon.restingTime)
                    } else {
                        TimelineView(.animation) { context in
                            OrderStageIcon(kind: kind, time: context.date.timeIntervalSince(openedAt))
                        }
                    }
                } else {
                    Image("BrandTile")
                        .resizable()
                        .interpolation(.high)
                        .scaledToFill()
                        .frame(width: 88, height: 88)
                        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                        .saturation(0)
                }
            }
            .frame(width: 168, height: 168)
            .id(iconKind.map { "\($0)" } ?? "none")
            .transition(.opacity.combined(with: .scale(scale: 0.92)))
            .accessibilityHidden(true)

            VStack(spacing: 8) {
                Text(title)
                    .font(.system(size: 26, weight: .heavy))
                    .foregroundColor(.white)
                    .contentTransition(.opacity)
                if !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.system(size: 15))
                        .foregroundColor(Color.white.opacity(0.65))
                        .multilineTextAlignment(.center)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.horizontal, 24)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .animation(.easeInOut(duration: 0.35), value: stage)
        .onChange(of: stage) { _, _ in openedAt = Date() }
    }
}

/// The 4-digit code the rider asks for before handing over the order.
struct DeliveryCodeRow: View {
    let code: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "lock.shield.fill")
                .font(.system(size: 18))
                .foregroundColor(.brandAccent)
            VStack(alignment: .leading, spacing: 2) {
                Text("Delivery code")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.white)
                Text("Share it with your rider at the door")
                    .font(.system(size: 11.5))
                    .foregroundColor(Color.white.opacity(0.6))
            }
            Spacer(minLength: 8)
            HStack(spacing: 4) {
                ForEach(Array(code.enumerated()), id: \.offset) { _, digit in
                    Text(String(digit))
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                        .frame(width: 24, height: 32)
                        .background(Color.white.opacity(0.1), in: RoundedRectangle(cornerRadius: 7, style: .continuous))
                }
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Delivery code \(code.map { String($0) }.joined(separator: " "))")
        }
    }
}

/// The app icon as a map pin for the DASHit hub.
struct BrandMapMarker: View {
    var size: CGFloat = 34

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: size * 0.27, style: .continuous)
        Image("BrandTile")
            .resizable()
            .interpolation(.high)
            .scaledToFill()
            .frame(width: size, height: size)
            .clipShape(shape)
            .overlay(shape.strokeBorder(Color.white, lineWidth: 2))
            .shadow(color: .black.opacity(0.3), radius: 4, x: 0, y: 2)
            .accessibilityHidden(true)
    }
}
