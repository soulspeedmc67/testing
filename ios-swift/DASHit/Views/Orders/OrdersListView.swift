import SwiftUI
import FirebaseFirestore

/// Live list of the signed-in shopper's orders, newest first.
@MainActor
final class OrderHistoryStore: ObservableObject {
    @Published private(set) var orders: [Order] = []
    @Published private(set) var isLoading = false

    private var listener: ListenerRegistration?
    private var listeningUid: String?

    func start(uid: String?) {
        guard uid != listeningUid else { return }
        listener?.remove()
        listener = nil
        listeningUid = uid
        guard let uid else {
            orders = []
            return
        }
        isLoading = true
        listener = FirestoreService.shared.listenUserOrders(userId: uid) { [weak self] orders in
            guard let self = self else { return }
            withAnimation(.dashitSpring) {
                self.orders = orders
                self.isLoading = false
            }
        }
    }

    deinit {
        listener?.remove()
    }
}

/// "Order Again" tab: past and live orders with one-tap reorder.
struct OrdersListView: View {
    var onOpenProfile: () -> Void

    @ObservedObject private var auth = AuthService.shared
    @ObservedObject private var cart = CartViewModel.shared
    @StateObject private var history = OrderHistoryStore()
    @State private var detailOrder: Order? = nil
    @State private var trackingOrder: Order? = nil

    init(onOpenProfile: @escaping () -> Void = {}) {
        self.onOpenProfile = onOpenProfile
    }

    var body: some View {
        NavigationStack {
            Group {
                if !auth.isAuthenticated {
                    emptyState(
                        symbol: "bag",
                        title: "Sign in to see your orders",
                        message: "Your past orders and live deliveries will appear here.",
                        action: ("Sign in", onOpenProfile)
                    )
                } else if history.isLoading && history.orders.isEmpty {
                    ScrollView {
                        OrderListSkeleton()
                            .padding(16)
                    }
                    .scrollDisabled(true)
                    .transition(.opacity)
                } else if history.orders.isEmpty {
                    emptyState(
                        symbol: "shippingbox",
                        title: "No orders yet",
                        message: "When you order, you can track it live and reorder it from here.",
                        action: nil
                    )
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(history.orders) { order in
                                OrderHistoryCard(
                                    order: order,
                                    onOpen: { detailOrder = order },
                                    onTrack: { trackingOrder = order },
                                    onReorder: { reorder(order) }
                                )
                            }
                        }
                        .padding(16)
                        .drivesTabBarVisibility(in: "ordersScroll")
                    }
                    .coordinateSpace(.named("ordersScroll"))
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.surface.ignoresSafeArea())
            .navigationTitle("Order again")
            .navigationBarTitleDisplayMode(.large)
            .toolbarBackground(Color.surface, for: .navigationBar)
            .sheet(item: $detailOrder) { order in
                OrderDetailSheet(order: order) {
                    detailOrder = nil
                    reorder(order)
                }
            }
            .fullScreenCover(item: $trackingOrder) { order in
                LiveTrackingMapView(orderId: order.id, initialOrder: order)
            }
        }
        .onAppear {
            history.start(uid: auth.firebaseUID)
        }
        .onChange(of: auth.isAuthenticated) { _, _ in
            history.start(uid: auth.firebaseUID)
        }
    }

    private func reorder(_ order: Order) {
        cart.reorder(order.items)
        cart.isCartSheetPresented = true
    }

    private func emptyState(symbol: String, title: String, message: String, action: (String, () -> Void)?) -> some View {
        VStack(spacing: 10) {
            Image(systemName: symbol)
                .font(.system(size: 46, weight: .light))
                .foregroundColor(.textFaint)
            Text(title)
                .font(.system(size: 19, weight: .bold))
                .foregroundColor(.textPrimary)
                .padding(.top, 4)
            Text(message)
                .font(.system(size: 14))
                .foregroundColor(.textMuted)
                .multilineTextAlignment(.center)
            if let action {
                Button {
                    HapticsManager.shared.light()
                    action.1()
                } label: {
                    Text(action.0)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 26)
                        .frame(height: 46)
                        .background(Color.brandOrange, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.pressable)
                .padding(.top, 8)
            }
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

/// One order in the history list.
private struct OrderHistoryCard: View {
    let order: Order
    var onOpen: () -> Void
    var onTrack: () -> Void
    var onReorder: () -> Void

    private var stage: DeliveryStage { order.status.stage }
    private var units: Int { order.items.reduce(0) { $0 + $1.qty } }
    private var cardShape: RoundedRectangle { RoundedRectangle(cornerRadius: 16, style: .continuous) }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                HStack(spacing: 6) {
                    Circle()
                        .fill(statusColor)
                        .frame(width: 7, height: 7)
                    Text(stage.isFinished ? stage.headline(riderName: nil) : stage.headline(riderName: order.driverName))
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.textPrimary)
                        .lineLimit(1)
                }
                Spacer()
                Text(CurrencyFormatter.format(order.grandTotal))
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundColor(.textPrimary)
            }

            HStack(spacing: -8) {
                ForEach(Array(order.items.prefix(4))) { item in
                    AsyncImage(url: URL(string: item.img)) { phase in
                        if let image = phase.image {
                            image
                                .resizable()
                                .scaledToFill()
                        } else if phase.error == nil && !item.img.isEmpty {
                            ShimmerView()
                        } else {
                            Color.surfaceMuted
                        }
                    }
                    .frame(width: 40, height: 40)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(Color.surfaceRaised, lineWidth: 2))
                }
                if order.items.count > 4 {
                    Text("+\(order.items.count - 4)")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.textSecondary)
                        .frame(width: 40, height: 40)
                        .background(Color.surfaceMuted, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(Color.surfaceRaised, lineWidth: 2))
                }
                Spacer()
            }

            Text("\(units) item\(units == 1 ? "" : "s") · \(order.placedDateText) · #\(order.id.suffix(6))")
                .font(.system(size: 12))
                .foregroundColor(.textMuted)
                .lineLimit(1)

            HStack(spacing: 10) {
                if !stage.isFinished {
                    Button(action: onTrack) {
                        Label("Track order", systemImage: "location.fill")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.brandAccent)
                            .frame(maxWidth: .infinity)
                            .frame(height: 38)
                            .background(Color.surfaceMuted, in: RoundedRectangle(cornerRadius: 11, style: .continuous))
                    }
                    .buttonStyle(.pressable)
                }
                Button(action: onReorder) {
                    Label("Order again", systemImage: "arrow.clockwise")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 38)
                        .background(Color.brandOrange, in: RoundedRectangle(cornerRadius: 11, style: .continuous))
                }
                .buttonStyle(.pressable)
                .disabled(order.items.isEmpty)
            }
        }
        .padding(14)
        .dashitCard(cardShape)
        .contentShape(cardShape)
        .onTapGesture(perform: onOpen)
    }

    private var statusColor: Color {
        switch stage {
        case .delivered: return .positive
        case .cancelled: return .danger
        default: return .brandOrange
        }
    }
}

extension Order {
    /// "24 Sep, 9:41 pm"
    var placedDateText: String {
        Date(timeIntervalSince1970: createdAt).formatted(.dateTime.day().month(.abbreviated).hour().minute())
    }
}
