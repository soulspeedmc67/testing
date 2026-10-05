import SwiftUI
import AudioToolbox

public struct AdminDashboardView: View {
    @StateObject private var vm = AdminDashboardViewModel.shared

    // Navigation and Sheet Modals
    @State private var selectedOrderForDetail: Order? = nil
    @State private var selectedOrderForDriver: Order? = nil
    @State private var orderToReject: Order? = nil
    @State private var orderToCancel: Order? = nil
    @State private var isAddSupplierSheetOpen: Bool = false
    @State private var isAddProductSheetOpen: Bool = false
    @State private var isAddDriverSheetOpen: Bool = false
    @State private var isStoreControlSheetOpen: Bool = false
    @State private var isAddOfferSheetOpen: Bool = false
    @State private var isAddCouponSheetOpen: Bool = false
    @State private var couponToEdit: Coupon? = nil
    @State private var isBatchInwardSheetOpen: Bool = false
    @State private var productToDelete: Product? = nil
    @State private var productToEdit: Product? = nil
    @State private var distributorToRemove: Distributor? = nil
    @State private var distributorToEmpty: String? = nil

    public var onSwitchToCustomer: (() -> Void)? = nil
    /// Shown as a Sign out button in the header when set.
    public var onSignOut: (() -> Void)? = nil
    @State private var isSignOutConfirmOpen = false
    @State private var sidebarSelection: AdminTab? = .home
    /// "More" stays folded until it's opened.
    @State private var isMoreOpen = false
    @State private var columnVisibility: NavigationSplitViewVisibility = .all

    public init(onSwitchToCustomer: (() -> Void)? = nil, onSignOut: (() -> Void)? = nil) {
        self.onSwitchToCustomer = onSwitchToCustomer
        self.onSignOut = onSignOut
    }

    public var body: some View {
        // The web console's layout: sections down the side, the chosen one on
        // the right. On iPhone the list comes first and each section opens over it.
        NavigationSplitView(columnVisibility: $columnVisibility) {
            sidebar
        } detail: {
            NavigationStack {
                detail(for: vm.selectedTab)
                    .navigationTitle(vm.selectedTab.rawValue)
                    .navigationBarTitleDisplayMode(vm.selectedTab == .home ? .inline : .large)
                    .toolbar { detailToolbar }
            }
        }
        .navigationSplitViewStyle(.balanced)
        .tint(AdminStyle.brand)
        .onChange(of: sidebarSelection) { _, tab in
            if let tab, tab != vm.selectedTab { vm.selectedTab = tab }
        }
        .onChange(of: vm.selectedTab) { _, tab in
            if sidebarSelection != tab { sidebarSelection = tab }
        }
        .confirmationDialog("Sign out of DASHit Admin?", isPresented: $isSignOutConfirmOpen, titleVisibility: .visible) {
            Button("Sign out", role: .destructive) { onSignOut?() }
            Button("Cancel", role: .cancel) {}
        }
        #if DEBUG
        .task {
            if let raw = ScreenshotHooks.adminTab, let tab = AdminTab(rawValue: raw) {
                vm.selectedTab = tab
            }
            if ScreenshotHooks.adminOpenOrder {
                try? await Task.sleep(for: .seconds(1.5))
                selectedOrderForDetail = vm.recentOrders.first
            }
        }
        #endif
            .alert("Not saved", isPresented: Binding(
                get: { vm.saveError != nil },
                set: { if !$0 { vm.saveError = nil } }
            )) {
                Button("OK", role: .cancel) { vm.saveError = nil }
            } message: {
                Text(vm.saveError ?? "")
            }
            .sheet(item: $selectedOrderForDetail) { order in
                OrderDetailSheetView(order: order, vm: vm)
            }
            .sheet(item: $selectedOrderForDriver, onDismiss: {
                selectedOrderForDriver = nil
            }) { order in
                AssignDriverSheetView(order: order, vm: vm) {
                    selectedOrderForDriver = nil
                }
            }
            .sheet(item: $orderToReject) { order in
                RejectOrderSheetView(order: order, vm: vm)
            }
            .sheet(item: $orderToCancel) { order in
                CancelOrderSheetView(order: order, vm: vm)
            }
            .sheet(isPresented: $isAddSupplierSheetOpen) {
                AddSupplierSheetView { name, phone, address, notes in
                    vm.addDistributor(name: name, phone: phone, address: address, notes: notes)
                }
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
            }
            .sheet(isPresented: $isAddProductSheetOpen) {
                AddProductSheetView(vm: vm, editingProduct: productToEdit)
            }
            .sheet(isPresented: $isAddDriverSheetOpen) {
                AddRiderSheet(vm: vm)
            }
            .sheet(isPresented: $isStoreControlSheetOpen) {
                StoreControlSheetView(vm: vm)
            }
            .sheet(isPresented: $isAddOfferSheetOpen) {
                AddOfferSheetView { code, title, discount, minOrder in
                    vm.addOffer(code: code, title: title, discountPercent: discount, minOrder: minOrder)
                }
            }
            .sheet(isPresented: $isAddCouponSheetOpen) {
                AddCouponSheetView(vm: vm)
            }
            .sheet(item: $couponToEdit) { coupon in
                AddCouponSheetView(vm: vm, editingCoupon: coupon)
            }
            .confirmationDialog(
                "Remove \(distributorToRemove?.name ?? "")?",
                isPresented: Binding(
                    get: { distributorToRemove != nil },
                    set: { if !$0 { distributorToRemove = nil } }
                ),
                titleVisibility: .visible
            ) {
                if let d = distributorToRemove {
                    Button("Remove", role: .destructive) {
                        vm.removeDistributor(d)
                        distributorToRemove = nil
                    }
                    Button("Keep", role: .cancel) {
                        distributorToRemove = nil
                    }
                }
            } message: {
                Text("Their items stay in your stock. Only the name is removed from this list.")
            }
            .confirmationDialog(
                "Delete all \(emptyCount) \(emptyCount == 1 ? "item" : "items") from \(distributorToEmpty ?? "")?",
                isPresented: Binding(
                    get: { distributorToEmpty != nil },
                    set: { if !$0 { distributorToEmpty = nil } }
                ),
                titleVisibility: .visible
            ) {
                if let name = distributorToEmpty {
                    Button("Delete all", role: .destructive) {
                        vm.deleteAllProducts(from: name)
                        distributorToEmpty = nil
                    }
                    Button("Keep them", role: .cancel) {
                        distributorToEmpty = nil
                    }
                }
            } message: {
                Text("Every item from \(distributorToEmpty ?? "") is removed from your stock and the shop. This can't be undone.")
            }
            .confirmationDialog(
                "Delete this item?",
                isPresented: Binding(
                    get: { productToDelete != nil },
                    set: { if !$0 { productToDelete = nil } }
                ),
                titleVisibility: .visible
            ) {
                if let p = productToDelete {
                    Button("Delete \"\(p.name)\"", role: .destructive) {
                        vm.deleteProduct(productId: p.id)
                        productToDelete = nil
                    }
                    Button("Cancel", role: .cancel) {
                        productToDelete = nil
                    }
                }
            } message: {
                if let p = productToDelete {
                    Text("\(p.name) will be removed from the shop straight away.")
                }
            }
    }

    // MARK: - Sidebar

    private var sidebar: some View {
        List(selection: $sidebarSelection) {
            Section {
                VStack(alignment: .leading, spacing: 6) {
                    (Text("DASH").foregroundColor(.primary) + Text("IT").foregroundColor(AdminStyle.brand))
                        .font(.system(size: 26, weight: .black))
                    HStack(spacing: 6) {
                        Circle()
                            .fill(vm.storeConfig.isOpen ? Color.green : Color.red)
                            .frame(width: 8, height: 8)
                        Text(vm.storeConfig.isOpen ? "Shop is open" : "Shop is closed")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(vm.storeConfig.isOpen ? .green : .red)
                    }
                }
                .padding(.vertical, 6)
                .listRowBackground(Color.clear)
            }

            Section(AdminTab.NavGroup.everyDay.rawValue) {
                ForEach(AdminTab.allCases.filter { $0.group == .everyDay }) { tab in
                    NavigationLink(value: tab) {
                        sidebarRow(tab)
                    }
                }
            }
            Section(AdminTab.NavGroup.more.rawValue, isExpanded: Binding(
                get: { isMoreOpen || vm.selectedTab.group == .more },
                set: { isMoreOpen = $0 }
            )) {
                ForEach(AdminTab.allCases.filter { $0.group == .more }) { tab in
                    NavigationLink(value: tab) {
                        sidebarRow(tab)
                    }
                }
            }

            Section {
                if let onSwitch = onSwitchToCustomer {
                    Button(action: onSwitch) {
                        Label("Open the shop app", systemImage: "cart.fill")
                            .font(.system(size: 16, weight: .semibold))
                    }
                }
                if onSignOut != nil {
                    Button(role: .destructive) {
                        isSignOutConfirmOpen = true
                    } label: {
                        Label("Sign out", systemImage: "rectangle.portrait.and.arrow.right")
                            .font(.system(size: 16, weight: .semibold))
                    }
                }
            }
        }
        .listStyle(.sidebar)
        .navigationTitle("Admin")
        .navigationBarTitleDisplayMode(.inline)
    }

    /// A section in the side list: big enough to tap without aiming, with a
    /// count when something is waiting there.
    private func sidebarRow(_ tab: AdminTab) -> some View {
        HStack(spacing: 12) {
            Image(systemName: tab.iconName)
                .font(.system(size: 17, weight: .semibold))
                .foregroundColor(AdminStyle.brand)
                .frame(width: 26)
            Text(tab.rawValue)
                .font(.system(size: 17, weight: .semibold))
            Spacer(minLength: 6)
            if tab == .orders && vm.activeOrdersCount > 0 {
                countBadge("\(vm.activeOrdersCount)", fill: AdminStyle.brand, text: .white)
            } else if tab == .inventory && vm.lowStockCount > 0 {
                countBadge("\(vm.lowStockCount) low", fill: Color.yellow, text: .black)
            }
        }
        .padding(.vertical, 6)
    }

    private func countBadge(_ label: String, fill: Color, text: Color) -> some View {
        Text(label)
            .font(.system(size: 12, weight: .heavy))
            .foregroundColor(text)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(fill, in: Capsule())
    }

    // MARK: - Detail

    @ViewBuilder
    private func detail(for tab: AdminTab) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            if tab != .home {
                Text(tab.explanation)
                    .font(.system(size: 15))
                    .foregroundColor(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 20)
                    .padding(.bottom, 6)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            Group {
                switch tab {
                case .home:
                    AdminHomeView(vm: vm, onOpenStoreSettings: { isStoreControlSheetOpen = true })
                case .orders:
                    ordersTabContent
                case .inventory:
                    stockTabContent
                case .addProduct:
                    addProductDirectContent
                case .riders:
                    ridersTabContent
                case .notify:
                    AdminNotifyView()
                case .distributors:
                    distributorsTabContent
                case .storeControls:
                    storeControlsTabContent
                case .offers:
                    offersTabContent
                case .batchInward:
                    batchInwardTabContent
                case .importCSV:
                    AdminCSVImportView(vm: vm)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(AdminStyle.page.ignoresSafeArea())
    }

    @ToolbarContentBuilder
    private var detailToolbar: some ToolbarContent {
        ToolbarItemGroup(placement: .topBarTrailing) {
            Button {
                vm.audioChimeEnabled.toggle()
                if vm.audioChimeEnabled { vm.playOrderChime() }
            } label: {
                Label(vm.audioChimeEnabled ? "Order sound on" : "Order sound off",
                      systemImage: vm.audioChimeEnabled ? "bell.badge.fill" : "bell.slash.fill")
            }
            .accessibilityHint("Plays a sound when a new order comes in")

            Button {
                isStoreControlSheetOpen = true
            } label: {
                HStack(spacing: 6) {
                    Circle()
                        .fill(vm.storeConfig.isOpen ? Color.green : Color.red)
                        .frame(width: 8, height: 8)
                    Text(vm.storeConfig.isOpen ? "Open" : "Closed")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(vm.storeConfig.isOpen ? .green : .red)
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background((vm.storeConfig.isOpen ? Color.green : Color.red).opacity(0.12), in: Capsule())
            }
            .accessibilityLabel(vm.storeConfig.isOpen ? "Shop is open. Change" : "Shop is closed. Change")
        }
    }

    // MARK: - Tab 1: Orders Content

    private var ordersTabContent: some View {
        ScrollView {
            VStack(spacing: 14) {
                // Status Filter Pills
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(["All", "Placed", "Packing", "Out for Delivery", "Delivered", "Cancelled"], id: \.self) { status in
                            let isSel = vm.orderFilterStatus == status
                            Button(action: {
                                withAnimation { vm.orderFilterStatus = status }
                            }) {
                                Text(status)
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(isSel ? .white : .secondary)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(isSel ? Color.primary : Color(uiColor: .secondarySystemGroupedBackground))
                                    .clipShape(Capsule())
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                }

                if vm.filteredOrders.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "shippingbox")
                            .font(.system(size: 42))
                            .foregroundColor(.secondary)
                            .padding(.top, 40)
                        Text("No orders in this state")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.secondary)
                    }
                } else {
                    LazyVStack(spacing: 12) {
                        ForEach(vm.filteredOrders) { order in
                            orderCard(for: order)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 30)
                }
            }
        }
    }

    private func orderCard(for order: Order) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("#\(order.id.prefix(8).uppercased())")
                    .font(.system(size: 14, weight: .bold, design: .monospaced))
                Text(Self.placedTime(order))
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.secondary)

                Spacer()

                Text(order.isAwaitingPickup ? "Rider assigned" : order.status.stage.label)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(order.isAwaitingPickup ? Color.purple : stageColor(order.status.stage))
                    .clipShape(Capsule())
            }

            // Who is bringing it, once a rider has been picked.
            if let rider = order.driverName, order.driverId?.isEmpty == false, !order.status.stage.isFinished {
                Label(order.isAwaitingPickup ? "\(rider) is coming to collect it" : "\(rider) is on the way",
                      systemImage: "scooter")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.purple)
            }

            Text(order.deliveryAddress.formattedSummary)
                .font(.system(size: 13))
                .foregroundColor(.secondary)
                .lineLimit(2)

            HStack {
                Text("\(order.items.count) items • ₹\(Int(order.grandTotal))")
                    .font(.system(size: 14, weight: .bold))

                Spacer()

                Button("Details") {
                    selectedOrderForDetail = order
                }
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.orange)
            }

            // Quick Dispatch Buttons
            HStack(spacing: 8) {
                if order.status.stage == .placed {
                    // Straight into the packing checklist for this order.
                    Button(action: {
                        vm.advanceOrderStatus(order: order)
                        selectedOrderForDetail = order
                    }) {
                        Label("Start Packing", systemImage: "shippingbox.fill")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(Color.blue)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                    Button(role: .destructive, action: {
                        orderToReject = order
                    }) {
                        Label("Cancel", systemImage: "xmark.circle")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.red)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 8)
                            .background(Color.red.opacity(0.12))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                } else if order.status.stage == .packing {
                    Button(action: { selectedOrderForDriver = order }) {
                        Label(order.isAwaitingPickup ? "Change rider" : "Pick a rider", systemImage: "scooter")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(Color.purple)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                    Button(role: .destructive, action: {
                        orderToReject = order
                    }) {
                        Label("Cancel", systemImage: "xmark.circle")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.red)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 8)
                            .background(Color.red.opacity(0.12))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                } else if order.status.stage == .onTheWay {
                    Button(action: { vm.advanceOrderStatus(order: order) }) {
                        Label("Confirm Delivered", systemImage: "checkmark.circle.fill")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(Color.green)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                    Button(role: .destructive, action: {
                        orderToReject = order
                    }) {
                        Label("Cancel", systemImage: "xmark.circle")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.red)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 8)
                            .background(Color.red.opacity(0.12))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
            }

            if order.status.stage == .cancelled, let reason = order.rejectionReason, !reason.isEmpty {
                HStack(alignment: .top, spacing: 6) {
                    Image(systemName: "xmark.octagon.fill")
                        .foregroundColor(.red)
                        .font(.system(size: 12))
                    Text("Reason: \(reason)")
                        .font(.system(size: 11.5, weight: .medium))
                        .foregroundColor(.red)
                        .lineLimit(2)
                }
                .padding(8)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.red.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
        .padding(14)
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    /// When the order came in: "10:42 am" today, "Yesterday, 9:10 pm", "25 Sep, 9:10 pm".
    static func placedTime(_ order: Order) -> String {
        let date = Date(timeIntervalSince1970: order.createdAt)
        let calendar = Calendar.current
        let time = date.formatted(date: .omitted, time: .shortened)
        if calendar.isDateInToday(date) { return time }
        if calendar.isDateInYesterday(date) { return "Yesterday, \(time)" }
        return "\(date.formatted(.dateTime.day().month(.abbreviated))), \(time)"
    }

    private func stageColor(_ stage: DeliveryStage) -> Color {
        switch stage {
        case .placed: return .orange
        case .packing: return .blue
        case .onTheWay: return .purple
        case .delivered: return .green
        case .cancelled: return .red
        }
    }

    // MARK: - Tab 2: Stock & Inventory Content

    private var stockTabContent: some View {
        ScrollView {
            VStack(spacing: 12) {
                // Metrics Strip
                metricsStripView

                // Search & Filter Bar
                HStack(spacing: 10) {
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.secondary)
                        TextField("Search items or distributors", text: $vm.searchQuery)
                            .font(.system(size: 14))
                        if !vm.searchQuery.isEmpty {
                            Button(action: { vm.searchQuery = "" }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                    .padding(10)
                    .background(Color(uiColor: .secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 10))

                    // Sort Menu
                    Menu {
                        ForEach(AdminSortOption.allCases) { opt in
                            Button(opt.rawValue) {
                                vm.sortOption = opt
                            }
                        }
                    } label: {
                        Image(systemName: "arrow.up.arrow.down")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.primary)
                            .padding(11)
                            .background(Color(uiColor: .secondarySystemGroupedBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                }
                .padding(.horizontal, 16)

                // Distributor filter
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        Button(action: { vm.selectedDistributor = nil }) {
                            Text("All")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(vm.selectedDistributor == nil ? .white : .primary)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(vm.selectedDistributor == nil ? Color.orange : Color(uiColor: .secondarySystemGroupedBackground))
                                .clipShape(Capsule())
                        }

                        ForEach(vm.distributors) { dist in
                            let isSel = vm.selectedDistributor == dist.name
                            Button(action: {
                                vm.selectedDistributor = isSel ? nil : dist.name
                            }) {
                                Text(dist.name)
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(isSel ? .white : .primary)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(isSel ? Color.orange : Color(uiColor: .secondarySystemGroupedBackground))
                                    .clipShape(Capsule())
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                }

                // Inventory Items List
                LazyVStack(spacing: 10) {
                    ForEach(vm.filteredProducts) { product in
                        inventoryRow(product: product)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 40)
            }
            .padding(.top, 10)
        }
    }

    private var metricsStripView: some View {
        HStack(spacing: 8) {
            metricCard(title: "ITEMS", value: "\(vm.totalProductsCount)", color: .blue)
            metricCard(title: "IN STOCK", value: "\(vm.totalStockUnits)", color: .green)
            metricCard(title: "STOCK VALUE", value: "₹\(Int(vm.totalStockValuation))", color: .purple)
            metricCard(title: "LOW STOCK", value: "\(vm.lowStockCount)", color: .orange)
        }
        .padding(.horizontal, 16)
    }

    private func metricCard(title: String, value: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 9, weight: .black))
                .foregroundColor(color)
            Text(value)
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(.primary)
                .minimumScaleFactor(0.8)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func inventoryRow(product: Product) -> some View {
        HStack(spacing: 12) {
            AsyncImage(url: URL(string: product.img)) { phase in
                if let img = phase.image {
                    img.resizable().scaledToFill()
                } else {
                    Color.gray.opacity(0.2)
                }
            }
            .frame(width: 50, height: 50)
            .clipShape(RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 3) {
                Text(product.name)
                    .font(.system(size: 14, weight: .semibold))
                    .lineLimit(1)

                Text(Distributor.resolvedName(product.distributor))
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
                    .lineLimit(1)

                Text("₹\(Int(product.price)) • \(product.unit)")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.orange)
            }

            Spacer()

            // Stock Steppers
            HStack(spacing: 8) {
                Button(action: { vm.updateStock(productId: product.id, delta: -1) }) {
                    Image(systemName: "minus.circle.fill")
                        .font(.system(size: 22))
                        .foregroundColor(.secondary)
                }
                .disabled((product.stock ?? 0) == 0)
                .opacity((product.stock ?? 0) == 0 ? 0.35 : 1)

                // No number yet means the item was added without a count.
                Text(product.stock.map { String($0) } ?? "–")
                    .font(.system(size: 14, weight: .bold))
                    .frame(minWidth: 26)
                    .accessibilityLabel(product.stock.map { "\($0) in stock" } ?? "Not counted yet")

                Button(action: { vm.updateStock(productId: product.id, delta: +1) }) {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 22))
                        .foregroundColor(.orange)
                }

                // Trash button
                Button(action: { productToDelete = product }) {
                    Image(systemName: "trash")
                        .font(.system(size: 16))
                        .foregroundColor(.red.opacity(0.8))
                        .padding(.leading, 4)
                }
            }
        }
        .padding(12)
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Tab 3: Direct Add Item Content

    private var addProductDirectContent: some View {
        AddProductSheetView(vm: vm, editingProduct: nil, isEmbedded: true)
    }

    // MARK: - Tab 4: Riders Content

    private var ridersTabContent: some View {
        AdminRidersTab(vm: vm)
    }

    // MARK: - Tab 5: Distributors Content

    private var distributorsTabContent: some View {
        ScrollView {
            VStack(spacing: 14) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Distributors")
                            .font(.system(size: 18, weight: .bold))
                        Text("The people you buy stock from.")
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Button("+ Add") {
                        isAddSupplierSheetOpen = true
                    }
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.orange)
                }
                .padding(.horizontal, 16)
                .padding(.top, 14)

                LazyVStack(spacing: 12) {
                    ForEach(vm.distributors) { dist in
                        distributorCard(dist: dist)
                    }
                }
                .padding(.horizontal, 16)

                if vm.distributors.count <= 1 {
                    Text("Add the people you buy from, so you can see whose stock is whose.")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                }
            }
            .padding(.bottom, 30)
        }
    }

    /// How many items the "Delete all" question is about.
    private var emptyCount: Int {
        guard let name = distributorToEmpty else { return 0 }
        return vm.supplierStats.first { $0.name == name }?.skuCount ?? 0
    }

    private func distributorCard(dist: Distributor) -> some View {
        let stat = vm.supplierStats.first { $0.name == dist.name }
        let items = stat?.skuCount ?? 0
        let units = stat?.totalUnits ?? 0
        return VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 12) {
                Image(systemName: dist.isSelf ? "person.fill" : "shippingbox.fill")
                    .font(.system(size: 15))
                    .foregroundColor(dist.isSelf ? .orange : .primary)
                    .frame(width: 38, height: 38)
                    .background(dist.isSelf ? Color.orange.opacity(0.12) : Color(uiColor: .tertiarySystemFill))
                    .clipShape(RoundedRectangle(cornerRadius: 10))

                VStack(alignment: .leading, spacing: 2) {
                    Text(dist.name)
                        .font(.system(size: 15, weight: .bold))
                        .lineLimit(1)
                    if dist.isSelf {
                        Text("My own stock")
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                    } else {
                        if !dist.phone.isEmpty {
                            Text(dist.phone)
                                .font(.system(size: 12))
                                .foregroundColor(.secondary)
                        }
                        if !dist.address.isEmpty {
                            Text(dist.address)
                                .font(.system(size: 12))
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                        }
                    }
                }

                Spacer()

                if !dist.isSelf, !dist.phone.isEmpty,
                   let url = URL(string: "tel:\(dist.phone.filter { "0123456789+".contains($0) })") {
                    Link(destination: url) {
                        Image(systemName: "phone.fill")
                            .font(.system(size: 13))
                            .foregroundColor(.white)
                            .padding(8)
                            .background(Color.green)
                            .clipShape(Circle())
                    }
                    .accessibilityLabel("Call \(dist.name)")
                }
            }

            HStack {
                Button {
                    vm.selectedDistributor = dist.name
                    vm.selectedTab = .inventory
                } label: {
                    Text("\(items) \(items == 1 ? "item" : "items") · \(units) units")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.primary)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color(uiColor: .tertiarySystemFill))
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)

                Spacer()

                if items > 0 {
                    Button {
                        distributorToEmpty = dist.name
                    } label: {
                        Text("Delete all")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.red)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(Color.red.opacity(0.1))
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Delete all \(items) items from \(dist.name)")
                }

                if !dist.isSelf {
                    Button {
                        distributorToRemove = dist
                    } label: {
                        Image(systemName: "trash")
                            .font(.system(size: 14))
                            .foregroundColor(.red.opacity(0.8))
                    }
                    .accessibilityLabel("Remove \(dist.name)")
                }
            }

            if !dist.isSelf && !dist.notes.isEmpty {
                Text(dist.notes)
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
            }
        }
        .padding(14)
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Tab 6: Store Controls Content

    private var storeControlsTabContent: some View {
        StoreControlSheetView(vm: vm, isEmbedded: true)
    }

    // MARK: - Tab 7: Discounts Content

    private var offersTabContent: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Section 1: Checkout Coupons / Offer Codes
                VStack(spacing: 12) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 6) {
                                Image(systemName: "tag.fill")
                                    .foregroundColor(.orange)
                                Text("Checkout Offer Codes (\(vm.coupons.count))")
                                    .font(.system(size: 17, weight: .bold))
                            }
                            Text("Coupons redeemable by shoppers in cart & checkout")
                                .font(.system(size: 11))
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                        HStack(spacing: 8) {
                            if vm.coupons.isEmpty {
                                Button("Reset Defaults") {
                                    vm.resetDefaultCoupons()
                                }
                                .font(.system(size: 11, weight: .semibold))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 5)
                                .background(Color(uiColor: .tertiarySystemGroupedBackground))
                                .clipShape(Capsule())
                            }
                            Button("+ Add Code") {
                                isAddCouponSheetOpen = true
                            }
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(Color.orange)
                            .clipShape(Capsule())
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 14)

                    if vm.coupons.isEmpty {
                        VStack(spacing: 6) {
                            Text("No offer codes configured")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.secondary)
                            Button("Load standard coupons (GET30, DASHIT50, FREEDEL)") {
                                vm.resetDefaultCoupons()
                            }
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.orange)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 24)
                        .background(Color(uiColor: .secondarySystemGroupedBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .padding(.horizontal, 16)
                    } else {
                        LazyVStack(spacing: 10) {
                            ForEach(vm.coupons) { coupon in
                                couponCard(coupon: coupon)
                            }
                        }
                        .padding(.horizontal, 16)
                    }
                }

                Divider()
                    .padding(.horizontal, 16)

                // Section 2: Banner Promotions & Offers
                VStack(spacing: 12) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 6) {
                                Image(systemName: "sparkles")
                                    .foregroundColor(.orange)
                                Text("Banner Promotions (\(vm.offers.count))")
                                    .font(.system(size: 17, weight: .bold))
                            }
                            Text("Marketing banners shown in app feeds")
                                .font(.system(size: 11))
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                        Button("+ Add Banner") {
                            isAddOfferSheetOpen = true
                        }
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.orange)
                    }
                    .padding(.horizontal, 16)

                    if vm.offers.isEmpty {
                        Text("No banner promotions added yet")
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 20)
                            .background(Color(uiColor: .secondarySystemGroupedBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .padding(.horizontal, 16)
                    } else {
                        LazyVStack(spacing: 10) {
                            ForEach(vm.offers) { offer in
                                offerCard(offer: offer)
                            }
                        }
                        .padding(.horizontal, 16)
                    }
                }
                .padding(.bottom, 30)
            }
        }
    }

    private func couponCard(coupon: Coupon) -> some View {
        let isActive = coupon.active ?? true
        let isFreeDel = coupon.waivesDelivery == true || coupon.code == "FREEDEL"

        return VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .center, spacing: 8) {
                Text(coupon.code)
                    .font(.system(size: 14, weight: .black, design: .monospaced))
                    .foregroundColor(.orange)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color.orange.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 6))

                Text(isActive ? "ACTIVE" : "INACTIVE")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundColor(isActive ? .green : .secondary)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background((isActive ? Color.green : Color.secondary).opacity(0.12))
                    .clipShape(Capsule())

                Spacer()

                Button(action: { couponToEdit = coupon }) {
                    Image(systemName: "pencil")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.secondary)
                        .padding(6)
                        .background(Color(uiColor: .tertiarySystemGroupedBackground))
                        .clipShape(Circle())
                }

                Button(action: { vm.deleteCoupon(code: coupon.code) }) {
                    Image(systemName: "trash")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.red)
                        .padding(6)
                        .background(Color.red.opacity(0.1))
                        .clipShape(Circle())
                }
            }

            VStack(alignment: .leading, spacing: 3) {
                Text(coupon.title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(isActive ? .primary : .secondary)
                if !coupon.description.isEmpty {
                    Text(coupon.description)
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
                if let condition = coupon.condition, !condition.isEmpty {
                    Text("• \(condition)")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(.orange)
                }
            }

            HStack(spacing: 8) {
                HStack(spacing: 3) {
                    Image(systemName: isFreeDel ? "truck.fill" : "percent")
                        .font(.system(size: 9))
                    Text(isFreeDel ? "Free Delivery" : "₹\(Int(coupon.discount)) OFF")
                        .font(.system(size: 11, weight: .bold))
                }
                .foregroundColor(isFreeDel ? .green : .orange)
                .padding(.horizontal, 7)
                .padding(.vertical, 3)
                .background((isFreeDel ? Color.green : Color.orange).opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 6))

                Text(coupon.minOrder > 0 ? "Min ₹\(Int(coupon.minOrder))" : "No minimum")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(Color(uiColor: .tertiarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 6))

                Spacer()

                Toggle("", isOn: Binding(
                    get: { coupon.active ?? true },
                    set: { vm.toggleCouponActive(code: coupon.code, active: $0) }
                ))
                .labelsHidden()
                .scaleEffect(0.8)
            }
        }
        .padding(12)
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .opacity(isActive ? 1.0 : 0.75)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func offerCard(offer: Offer) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(offer.code)
                    .font(.system(size: 15, weight: .black, design: .monospaced))
                    .foregroundColor(.orange)
                Text(offer.title)
                    .font(.system(size: 13))
                    .foregroundColor(.primary)
                Text("\(offer.discountPercent)% OFF • Min Order ₹\(Int(offer.minOrder ?? 199.0))")
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
            }

            Spacer()

            Toggle("", isOn: Binding(
                get: { offer.active ?? true },
                set: { vm.toggleOffer(offerId: offer.id, active: $0) }
            ))
            .labelsHidden()

            Button(action: { vm.deleteOffer(offerId: offer.id) }) {
                Image(systemName: "trash")
                    .font(.system(size: 14))
                    .foregroundColor(.red)
            }
        }
        .padding(14)
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Tab 8: Batch Inward Content

    private var batchInwardTabContent: some View {
        BatchInwardSheetView(vm: vm)
    }
}

// MARK: - Order Detail Sheet View

/// An order opened from the list: a packing checklist first. Tap an item to
/// tick it off as it goes in the bag; ticks are kept on this device, so
/// closing the order doesn't lose them. The next step sits at the bottom, and
/// the address, total and cancel are tucked under "More about this order".
struct OrderDetailSheetView: View {
    let order: Order
    @ObservedObject var vm: AdminDashboardViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var isAssignRiderOpen = false
    @State private var isRejectSheetOpen = false
    @State private var packed: Set<String> = []
    @State private var isMoreOpen = false

    private var storageKey: String { "dashit_admin_packed_\(order.id)" }

    /// The order as it is now: its stage changes while this is open.
    private var live: Order { vm.recentOrders.first { $0.id == order.id } ?? order }

    private func lineKey(_ item: CartItem) -> String {
        item.id.isEmpty ? item.name : item.id
    }

    private var packedCount: Int { order.items.filter { packed.contains(lineKey($0)) }.count }
    private var isAllPacked: Bool { !order.items.isEmpty && packedCount == order.items.count }

    var body: some View {
        NavigationStack {
            ScrollView(.vertical, showsIndicators: true) {
                VStack(alignment: .leading, spacing: 18) {
                    progressHeader

                    // The drop on a map, before the shop commits to packing it.
                    AdminOrderLocationCard(
                        order: live,
                        settings: vm.nightCharge,
                        onCancel: [DeliveryStage.placed, .packing, .onTheWay].contains(live.status.stage)
                            ? { isRejectSheetOpen = true }
                            : nil
                    )

                    ForEach(vm.itemsByDistributor(order)) { group in
                        VStack(alignment: .leading, spacing: 0) {
                            Text("From \(group.distributor)")
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(.orange)
                                .padding(.horizontal, 4)
                                .padding(.bottom, 8)
                            VStack(spacing: 0) {
                                ForEach(Array(group.items.enumerated()), id: \.offset) { index, item in
                                    if index > 0 { Divider().padding(.leading, 64) }
                                    checklistRow(item)
                                }
                            }
                            .background(Color(uiColor: .secondarySystemGroupedBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        }
                    }

                    DisclosureGroup(isExpanded: $isMoreOpen) {
                        moreDetails
                            .padding(.top, 10)
                    } label: {
                        Text("More about this order")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(.primary)
                    }
                    .tint(.secondary)
                    .padding(16)
                    .background(Color(uiColor: .secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .padding(16)
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .safeAreaInset(edge: .bottom, spacing: 0) {
                nextStep
            }
            .navigationTitle("Order #\(order.id.suffix(6).uppercased())")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .saveErrorAlert(vm)
            .sheet(isPresented: $isAssignRiderOpen, onDismiss: {
                // Close the details too once a rider was picked; stay if not.
                if vm.recentOrders.first(where: { $0.id == order.id })?.driverId?.isEmpty == false {
                    dismiss()
                }
            }) {
                AssignDriverSheetView(order: live, vm: vm) {
                    isAssignRiderOpen = false
                }
            }
            .sheet(isPresented: $isRejectSheetOpen) {
                RejectOrderSheetView(order: live, vm: vm) {
                    dismiss()
                }
            }
            .onAppear {
                packed = Set(UserDefaults.standard.stringArray(forKey: storageKey) ?? [])
            }
        }
    }

    // MARK: - Checklist

    private var progressHeader: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                Text(isAllPacked ? "Everything is packed" : "\(packedCount) of \(order.items.count) packed")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(isAllPacked ? .green : .primary)
                    .contentTransition(.numericText())
                Spacer()
                Text(live.status.stage.label)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.orange)
                    .contentTransition(.opacity)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color(uiColor: .tertiarySystemFill))
                    Capsule()
                        .fill(isAllPacked ? Color.green : Color.orange)
                        .frame(width: order.items.isEmpty ? 0 : geo.size.width * CGFloat(packedCount) / CGFloat(order.items.count))
                }
            }
            .frame(height: 6)
            // Paid online means the rider collects nothing at the door.
            if live.paymentMethod.lowercased().contains("online") {
                Label("Paid online: collect nothing", systemImage: "checkmark.seal.fill")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.green)
            } else {
                Label("Cash on delivery: collect ₹\(Int(live.grandTotal))", systemImage: "banknote")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.orange)
            }
            Text("Tap an item when it's in the bag.")
                .font(.system(size: 13))
                .foregroundColor(.secondary)
        }
        .animation(.spring(response: 0.35, dampingFraction: 0.85), value: packedCount)
    }

    private func checklistRow(_ item: CartItem) -> some View {
        let key = lineKey(item)
        let isPacked = packed.contains(key)
        return Button {
            toggle(key)
        } label: {
            HStack(spacing: 14) {
                Image(systemName: isPacked ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 28, weight: .regular))
                    .foregroundColor(isPacked ? .green : Color(uiColor: .tertiaryLabel))
                    .contentTransition(.symbolEffect(.replace))
                    .frame(width: 34)

                AsyncImage(url: URL(string: item.img)) { phase in
                    if let image = phase.image {
                        image.resizable().scaledToFit()
                    } else {
                        Color(uiColor: .tertiarySystemFill)
                    }
                }
                .frame(width: 40, height: 40)
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                .opacity(isPacked ? 0.5 : 1)

                VStack(alignment: .leading, spacing: 2) {
                    Text(item.name)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(isPacked ? .secondary : .primary)
                        .strikethrough(isPacked, color: .secondary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    if !item.unit.isEmpty {
                        Text(item.unit)
                            .font(.system(size: 13))
                            .foregroundColor(.secondary)
                    }
                }
                Spacer(minLength: 8)
                Text("×\(item.quantity)")
                    .font(.system(size: 18, weight: .heavy, design: .rounded))
                    .foregroundColor(isPacked ? .secondary : .primary)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(item.quantity) \(item.name)")
        .accessibilityValue(isPacked ? "Packed" : "Not packed")
    }

    private func toggle(_ key: String) {
        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
            if packed.contains(key) { packed.remove(key) } else { packed.insert(key) }
        }
        UserDefaults.standard.set(Array(packed), forKey: storageKey)
        if isAllPacked {
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        } else {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        }
    }

    // MARK: - Next step and the rest

    private func primaryAction(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 15)
                .background(Color.orange)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
    }

    /// A packed order goes out only with a rider assigned.
    @ViewBuilder
    private var nextStep: some View {
        switch live.status.stage {
        case .placed:
            // Moves it to packing and stays here, for ticking items off.
            bottomBar(primaryAction("Start packing") {
                vm.advanceOrderStatus(order: live)
            })
        case .packing:
            if live.isAwaitingPickup {
                // The rider sends it out with "Start delivery" when they collect it.
                bottomBar(VStack(spacing: 8) {
                    Label("\(live.driverName ?? "The rider") is coming to collect it", systemImage: "scooter")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.purple)
                        .frame(maxWidth: .infinity)
                    Button("Change rider") { isAssignRiderOpen = true }
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.orange)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                })
            } else {
                bottomBar(primaryAction("Assign rider") {
                    isAssignRiderOpen = true
                })
            }
        case .onTheWay:
            bottomBar(primaryAction("Confirm delivered") {
                vm.advanceOrderStatus(order: live)
                dismiss()
            })
        default:
            EmptyView()
        }
    }

    private func bottomBar<Content: View>(_ content: Content) -> some View {
        content
            .padding(.horizontal, 16)
            .padding(.top, 10)
            .padding(.bottom, 8)
            .background(.bar)
    }

    private var moreDetails: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Deliver to")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.secondary)
                Text(order.deliveryAddress.formattedSummary)
                    .font(.system(size: 14))
            }
            HStack {
                Text("Total")
                    .font(.system(size: 15, weight: .bold))
                Spacer()
                Text("₹\(Int(order.grandTotal))")
                    .font(.system(size: 17, weight: .black))
                    .foregroundColor(.orange)
            }
            if live.status.stage == .cancelled, let reason = live.rejectionReason, !reason.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Image(systemName: "xmark.octagon.fill")
                            .foregroundColor(.red)
                        Text("Order Cancelled / Rejected")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.red)
                    }
                    Text("Reason: \(reason)")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.secondary)
                }
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.red.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            if [DeliveryStage.placed, .packing, .onTheWay].contains(live.status.stage) {
                Button(role: .destructive) {
                    isRejectSheetOpen = true
                } label: {
                    Label("Cancel or reject order with reason", systemImage: "xmark.circle.fill")
                        .font(.system(size: 14, weight: .semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                }
            }
        }
    }
}

// MARK: - Save errors on sheets

extension View {
    /// The dashboard shows `saveError` as an alert, but not while a sheet is
    /// over it: a refused save from the order or rider sheet went unseen.
    func saveErrorAlert(_ vm: AdminDashboardViewModel) -> some View {
        alert("Not saved", isPresented: Binding(
            get: { vm.saveError != nil },
            set: { if !$0 { vm.saveError = nil } }
        )) {
            Button("OK", role: .cancel) { vm.saveError = nil }
        } message: {
            Text(vm.saveError ?? "")
        }
    }
}

// MARK: - Assign Driver Sheet View

struct AssignDriverSheetView: View {
    let order: Order
    @ObservedObject var vm: AdminDashboardViewModel
    var onDismiss: (() -> Void)? = nil
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                if vm.approvedDrivers.isEmpty {
                    Text("No riders can deliver yet. Add or approve one in the Riders tab.")
                        .foregroundColor(.secondary)
                }
                ForEach(vm.approvedDrivers) { driver in
                    let load = vm.activeOrderCount(for: driver)
                    let isAssigned = (vm.recentOrders.first(where: { $0.id == order.id })?.driverId ?? order.driverId) == driver.id
                    Button(action: {
                        vm.assignDriver(orderId: order.id, driver: driver)
                        onDismiss?()
                        dismiss()
                    }) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(driver.name)
                                    .font(.system(size: 16, weight: .bold))
                                    .foregroundColor(.primary)
                                Text(load > 0 ? "Carrying \(load) order\(load == 1 ? "" : "s")" : "Free now")
                                    .font(.system(size: 13))
                                    .foregroundColor(load > 0 ? .orange : .green)
                            }
                            Spacer()
                            if isAssigned {
                                Image(systemName: "checkmark.circle.fill").foregroundColor(.orange)
                            } else {
                                Image(systemName: "chevron.right").foregroundColor(.secondary)
                            }
                        }
                    }
                }
            }
            .navigationTitle(order.driverId?.isEmpty == false ? "Change rider" : "Pick a rider")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        onDismiss?()
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Add / Edit Product Sheet View

struct AddProductSheetView: View {
    @ObservedObject var vm: AdminDashboardViewModel
    var editingProduct: Product?
    /// Shown as the "Add an item" page rather than a pop-up: no Cancel, and
    /// saving clears the form for the next item instead of closing.
    var isEmbedded: Bool = false
    @Environment(\.dismiss) private var dismiss

    @State private var name: String = ""
    @State private var unit: String = ""
    @State private var price: String = ""
    @State private var originalPrice: String = ""
    @State private var cat: String = "Staples"
    @State private var distributor: String = Distributor.selfName
    @State private var img: String = ""
    @State private var stock: String = ""
    @State private var badge: String = ""
    @State private var lastSaved: String?
    // Barcode scanning: the code read, the shop item it already belongs to, and what the lookup found.
    @State private var isScannerOpen = false
    @State private var scannedBarcode: String?
    @State private var matchedProduct: Product?
    @State private var scanStatus: String?
    @State private var isLookingUp = false
    /// Stock items that look like the scanned pack. Most stock came in without
    /// barcodes, so a scan alone can't tell it's already in the shop.
    @State private var possibleMatches: [Product] = []
    /// A barcode no database has, so the owner can look it up on the web.
    @State private var unknownBarcode: String?
    /// The pack barcode last looked up, and which database has it (nil: none
    /// does), so the owner can add their own photo of it to Open Food Facts.
    @State private var lookedUpBarcode: String?
    @State private var packSite: String?
    @State private var isAddingToOpenFacts = false

    private var priceValue: Double? {
        Double(price.trimmingCharacters(in: .whitespaces)).flatMap { $0.isFinite && $0 >= 0 ? $0 : nil }
    }
    /// The item already in the shop that this form changes, if any.
    private var existingItem: Product? { editingProduct ?? matchedProduct }
    private var canSave: Bool {
        // The listing rule: a new item goes on the app only with a real photo.
        !name.trimmingCharacters(in: .whitespaces).isEmpty && priceValue != nil
            && (existingItem != nil || ProductPhotoRule.isRealPhoto(img))
    }

    private static func amount(_ value: Double) -> String {
        value == value.rounded() ? String(Int(value)) : String(value)
    }

    let categories = ["Staples", "Dairy", "Bakery", "Fruits", "Snacks", "Biscuits", "Beverages", "Instant Food", "Spices", "Personal Care"]

    var body: some View {
        OptionalNavigationStack(enabled: !isEmbedded) {
            Form {
                if let lastSaved {
                    Section {
                        Label("“\(lastSaved)” is now in the shop.", systemImage: "checkmark.circle.fill")
                            .foregroundColor(.green)
                            .font(.system(size: 15, weight: .semibold))
                    }
                }
                #if ADMIN_APP_TARGET
                Section {
                    Button {
                        isScannerOpen = true
                    } label: {
                        Label(editingProduct == nil ? "Scan the barcode" : "Scan the pack for its photo", systemImage: "barcode.viewfinder")
                            .font(.system(size: 17, weight: .semibold))
                    }
                    .disabled(isLookingUp)
                    // On this always-there row, so the sheet stays put when the new photo hides its own button.
                    .sheet(isPresented: $isAddingToOpenFacts) {
                        if let lookedUpBarcode {
                            AddToOpenFactsSheet(
                                barcode: lookedUpBarcode,
                                existingSite: packSite,
                                name: name,
                                brand: "",
                                unit: unit,
                                category: cat
                            ) { link in
                                img = link
                                unknownBarcode = nil
                                scanStatus = "Added to Open Food Facts. The photo is now on this item; save to keep it."
                            }
                        }
                    }
                    if let scanStatus {
                        HStack(spacing: 10) {
                            if isLookingUp { ProgressView() }
                            Text(scanStatus)
                                .font(.system(size: 14))
                                .foregroundColor(.secondary)
                        }
                    }
                    if let lookedUpBarcode, !isLookingUp, !ProductPhotoRule.isRealPhoto(img) {
                        Button {
                            isAddingToOpenFacts = true
                        } label: {
                            Label("Take a photo and add it to Open Food Facts", systemImage: "camera")
                        }
                    }
                    if let unknownBarcode, let search = URL(string: "https://www.google.com/search?q=\(unknownBarcode)") {
                        Link(destination: search) {
                            Label("Search the web for \(unknownBarcode)", systemImage: "safari")
                        }
                    }
                    if !possibleMatches.isEmpty {
                        Text("Already in your stock? Tap it to put this photo on it instead of adding a new item.")
                            .font(.system(size: 14, weight: .semibold))
                        ForEach(possibleMatches) { product in
                            Button {
                                useExisting(product)
                            } label: {
                                HStack {
                                    Text(product.name)
                                        .foregroundColor(.primary)
                                        .lineLimit(2)
                                    Spacer()
                                    Text("Use this")
                                        .font(.system(size: 14, weight: .semibold))
                                }
                            }
                        }
                    }
                } footer: {
                    Text(editingProduct == nil
                         ? "Point the camera at the barcode on the pack. The name, size and photo are filled in for you."
                         : "Adds the photo of this pack, if the item doesn't have one yet.")
                }
                #endif

                Section("About the item") {
                    TextField("Name, e.g. Amul Taaza Milk", text: $name)
                    TextField("Pack size, e.g. 1 kg or 500 ml", text: $unit)
                    Picker("Category", selection: $cat) {
                        ForEach(categories, id: \.self) { c in
                            Text(c).tag(c)
                        }
                    }
                    Picker("Distributor", selection: $distributor) {
                        ForEach(vm.distributors) { d in
                            Text(d.name).tag(d.name)
                        }
                    }
                }

                Section("Price and stock") {
                    TextField("Price you sell at (₹)", text: $price)
                        .keyboardType(.decimalPad)
                    TextField("MRP printed on the pack (₹, optional)", text: $originalPrice)
                        .keyboardType(.decimalPad)
                    TextField("How many you have", text: $stock)
                        .keyboardType(.numberPad)
                    TextField("Label on the item, e.g. Fresh (optional)", text: $badge)
                }

                Section {
                    TextField("Photo link, starting with https://", text: $img)
                        .keyboardType(.URL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    if let url = URL(string: img), !img.isEmpty {
                        AsyncImage(url: url) { phase in
                            if let img = phase.image {
                                img.resizable().scaledToFit().frame(height: 120)
                            }
                        }
                    }
                } header: {
                    Text(existingItem == nil ? "Photo" : "Photo (optional)")
                } footer: {
                    if existingItem == nil {
                        Text("Every item on the app needs a photo of the pack. Scan the barcode to find one, or paste a link.")
                    }
                }
            }
            .barcodeScanner(isPresented: $isScannerOpen) { code in
                handleScan(code)
            }
            .navigationTitle(isEmbedded ? AdminTab.addProduct.rawValue : (editingProduct != nil ? "Edit item" : "Add an item"))
            .navigationBarTitleDisplayMode(isEmbedded ? .large : .inline)
            .onAppear {
                // Editing starts from the item's current details, not the new-item defaults.
                guard let p = editingProduct else { return }
                fill(from: p)
            }
            .toolbar {
                if !isEmbedded {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") { dismiss() }
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        guard let pVal = priceValue else { return }
                        let origVal = Double(originalPrice.trimmingCharacters(in: .whitespaces))
                        // A blank count leaves an existing item's stock as it is.
                        let sVal = Int(stock.trimmingCharacters(in: .whitespaces)) ?? (existingItem == nil ? 0 : existingItem?.stock)
                        let cleanName = name.trimmingCharacters(in: .whitespaces)
                        vm.saveProduct(
                            // A scanned new item is saved under its barcode, like the web console does.
                            id: existingItem?.id ?? scannedBarcode,
                            name: cleanName,
                            unit: unit.isEmpty ? "1 pc" : unit,
                            price: pVal,
                            originalPrice: origVal,
                            cat: cat,
                            distributor: distributor,
                            img: img,
                            stock: sVal,
                            badge: badge
                        )
                        if isEmbedded {
                            // Ready for the next item.
                            withAnimation { lastSaved = cleanName }
                            name = ""; unit = ""; price = ""; originalPrice = ""; stock = ""; badge = ""; img = ""
                            scannedBarcode = nil; matchedProduct = nil; scanStatus = nil; possibleMatches = []; unknownBarcode = nil
                            lookedUpBarcode = nil; packSite = nil
                        } else {
                            dismiss()
                        }
                    }
                    .font(.system(size: 17, weight: .bold))
                    .disabled(!canSave)
                }
            }
        }
    }
}

extension AddProductSheetView {
    /// Starts the form from an item already in the shop.
    private func fill(from p: Product) {
        name = p.name
        unit = p.unit
        price = Self.amount(p.price)
        originalPrice = p.originalPrice.map(Self.amount) ?? ""
        cat = p.cat
        distributor = Distributor.resolvedName(p.distributor)
        img = p.img
        stock = p.stock.map { String($0) } ?? ""
        badge = p.badge ?? ""
    }

    /// A barcode was read: open the item if the shop already has it, then
    /// fill in what's still empty (and the photo) from the product database.
    private func handleScan(_ raw: String) {
        let code = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !code.isEmpty else { return }
        if editingProduct == nil {
            if let existing = vm.products.first(where: { $0.id == code }) {
                matchedProduct = existing
                scannedBarcode = nil
                fill(from: existing)
            } else {
                matchedProduct = nil
                // Only a pack barcode (all digits) becomes the new item's id; anything else could break the database path.
                scannedBarcode = code.range(of: #"^\d{8,14}$"#, options: .regularExpression) != nil ? code : nil
            }
        }
        let known = matchedProduct.map { "“\($0.name)” is already in your shop. " } ?? ""
        scanStatus = "\(known)Looking up \(code)…"
        possibleMatches = []
        unknownBarcode = nil
        lookedUpBarcode = nil
        packSite = nil
        isLookingUp = true
        #if ADMIN_APP_TARGET
        Task {
            defer { isLookingUp = false }
            let outcome = await PackLookup.find(barcode: code)
            // Only a definite answer allows adding a photo: while a database is
            // busy it isn't known whether the pack is already there.
            if outcome == .notFound || outcome.pack != nil {
                lookedUpBarcode = code
                packSite = outcome.pack?.site
            }
            guard let pack = outcome.pack else {
                switch outcome {
                case .notAPackBarcode:
                    scanStatus = "That read “\(code)”, which isn't the maker's barcode. Scan the barcode with 13 digits under the stripes."
                case .busy:
                    scanStatus = known + "The product database is busy right now (\(code)). Scan again in a minute."
                case .offline:
                    scanStatus = known + "No internet. Connect and scan again."
                default:
                    unknownBarcode = code
                    scanStatus = known + (ProductPhotoRule.isRealPhoto(img)
                        ? "\(code) isn't in the free product databases, so nothing changed. Change what you need and save."
                        : "\(code) isn't in the free product databases yet. Add your own photo of it below, or type its details and paste a photo link.")
                }
                return
            }
            if name.trimmingCharacters(in: .whitespaces).isEmpty {
                let brandShown = pack.brand.isEmpty || pack.name.localizedCaseInsensitiveContains(pack.brand)
                name = brandShown ? pack.name : "\(pack.brand) \(pack.name)"
            }
            if unit.trimmingCharacters(in: .whitespaces).isEmpty { unit = pack.unit }
            if ProductPhotoRule.isRealPhoto(img) {
                scanStatus = known + "Found it. The photo you already have was kept."
            } else if !pack.photo.isEmpty {
                img = pack.photo
                scanStatus = known + "Found it. Photo added. Check it's the right pack."
            } else {
                scanStatus = known + "Found it, but it has no photo yet. Add your own photo below, or paste a photo link."
            }
            if editingProduct == nil && matchedProduct == nil {
                possibleMatches = Self.likelySame(as: "\(pack.brand) \(pack.name)", in: vm.products)
            }
        }
        #endif
    }
}

extension AddProductSheetView {
    /// Switches the form to an item already in stock, keeping the photo the
    /// scan just found when that item has none.
    private func useExisting(_ product: Product) {
        let foundPhoto = img
        matchedProduct = product
        scannedBarcode = nil
        possibleMatches = []
        fill(from: product)
        if !ProductPhotoRule.isRealPhoto(img) && ProductPhotoRule.isRealPhoto(foundPhoto) {
            img = foundPhoto
        }
        scanStatus = "Changing “\(product.name)”. Check the photo and save."
    }

    /// Up to three stock items sharing at least two words with the pack's
    /// brand and name (or its one word), most shared words first.
    private static func likelySame(as packName: String, in products: [Product]) -> [Product] {
        let packWords = words(packName).filter { $0.count >= 3 && $0.rangeOfCharacter(from: .decimalDigits) == nil }
        guard !packWords.isEmpty else { return [] }
        let needed = min(2, packWords.count)
        return products
            .compactMap { product -> (Product, Int)? in
                let shared = packWords.intersection(words(product.name)).count
                return shared >= needed ? (product, shared) : nil
            }
            .sorted { $0.1 > $1.1 }
            .prefix(3)
            .map { $0.0 }
    }

    private static func words(_ text: String) -> Set<String> {
        Set(ProductSearch.normalized(text)
            .components(separatedBy: CharacterSet.alphanumerics.inverted)
            .filter { !$0.isEmpty })
    }
}

/// Which photo links count as a real photo of the item, the same rule as the
/// web console: a web link that isn't a stock picture.
enum ProductPhotoRule {
    private static let stockPhotoHosts = ["unsplash.com", "picsum.photos", "placeholder.com", "placehold.co", "dummyimage.com"]

    static func isRealPhoto(_ link: String) -> Bool {
        guard let url = URL(string: link.trimmingCharacters(in: .whitespacesAndNewlines)),
              let scheme = url.scheme?.lowercased(), scheme == "https" || scheme == "http",
              let host = url.host?.lowercased(), !host.isEmpty else { return false }
        return !stockPhotoHosts.contains { host == $0 || host.hasSuffix(".\($0)") }
    }
}

/// A sheet's own NavigationStack, left out when the same screen is shown
/// inside the admin's page (which already has one).
struct OptionalNavigationStack<Content: View>: View {
    let enabled: Bool
    @ViewBuilder var content: Content

    var body: some View {
        if enabled {
            NavigationStack { content }
        } else {
            content
        }
    }
}

// MARK: - Store Control Sheet View

struct StoreControlSheetView: View {
    @ObservedObject var vm: AdminDashboardViewModel
    /// Shown as the "Shop settings" page rather than a pop-up.
    var isEmbedded: Bool = false
    @Environment(\.dismiss) private var dismiss

    @State private var isOpen: Bool = true
    @State private var closeReason: String = "Normal Operations"
    @State private var isSurge: Bool = false
    @State private var nightMode: NightCharge.Mode = .auto
    @State private var perKmText = ""
    @State private var minFeeText = ""
    @State private var petrolText = ""
    @State private var mileageText = ""

    let reasons = ["Normal Operations", "Heavy Rain & Flooding", "Late Night Shift", "Power Outage", "Restocking Inventory"]

    var body: some View {
        OptionalNavigationStack(enabled: !isEmbedded) {
            Form {
                Section {
                    Toggle(isOn: $isOpen) {
                        Text("Take orders now")
                            .font(.system(size: 17, weight: .semibold))
                    }
                    .tint(.green)

                    if !isOpen {
                        Picker("Why is it closed?", selection: $closeReason) {
                            ForEach(reasons, id: \.self) { r in
                                Text(r).tag(r)
                            }
                        }
                    }
                } header: {
                    Text("Shop")
                } footer: {
                    Text(isOpen ? "Customers can order now." : "Customers see that the shop is closed, and why.")
                }

                Section {
                    Toggle("Busy-hours delivery fee (+₹20)", isOn: $isSurge)
                } header: {
                    Text("Busy hours")
                } footer: {
                    Text("Turn on when there are too many orders or not enough riders.")
                }

                Section {
                    Picker("Charge by distance", selection: $nightMode) {
                        ForEach(NightCharge.Mode.allCases) { mode in
                            Text(mode.title).tag(mode)
                        }
                    }
                    numberRow("Charge per km (₹)", text: $perKmText)
                    numberRow("Minimum charge (₹)", text: $minFeeText)
                } header: {
                    Text("Night delivery charge")
                } footer: {
                    Text(nightChargeNote)
                }

                Section {
                    numberRow("Petrol (₹ a litre)", text: $petrolText)
                    numberRow("Bike mileage (km a litre)", text: $mileageText)
                } header: {
                    Text("Rider's petrol")
                } footer: {
                    Text("Every order shows what the trip costs the rider in petrol: the road from the store to the door and back, at these figures. Change the price when the pump price changes.")
                }
            }
            .navigationTitle(isEmbedded ? AdminTab.storeControls.rawValue : "Shop settings")
            .navigationBarTitleDisplayMode(isEmbedded ? .large : .inline)
            .onAppear {
                isOpen = vm.storeConfig.isOpen
                closeReason = vm.storeConfig.closeReason
                isSurge = vm.storeConfig.isHighDemand
                showNightCharge(vm.nightCharge)
            }
            // The saved figures arrive a moment after this page opens.
            .onChange(of: vm.nightCharge) { _, saved in
                showNightCharge(saved)
            }
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        vm.toggleStore(isOpen: isOpen, reason: closeReason)
                        vm.toggleSurgePricing(enabled: isSurge)
                        vm.saveNightCharge(editedNightCharge)
                        if !isEmbedded { dismiss() }
                    }
                    .font(.system(size: 17, weight: .bold))
                }
            }
        }
    }

    // MARK: - Night delivery charge

    private func numberRow(_ label: String, text: Binding<String>) -> some View {
        HStack {
            Text(label)
            Spacer()
            TextField("0", text: text)
                .keyboardType(.decimalPad)
                .multilineTextAlignment(.trailing)
                .frame(width: 90)
        }
    }

    private func showNightCharge(_ saved: NightCharge.Settings) {
        nightMode = saved.mode
        perKmText = Self.plain(saved.perKm)
        minFeeText = Self.plain(saved.minFee)
        petrolText = Self.plain(saved.petrolPrice)
        mileageText = Self.plain(saved.mileage)
    }

    /// 6 rather than 6.0, 106.04 as it is.
    private static func plain(_ value: Double) -> String {
        value == value.rounded() ? String(Int(value)) : String(value)
    }

    private static func number(_ text: String) -> Double? {
        Double(text.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: ",", with: "."))
    }

    /// What is on the page; a blank or out-of-range field keeps the saved figure.
    private var editedNightCharge: NightCharge.Settings {
        var edited = vm.nightCharge
        edited.mode = nightMode
        if let value = Self.number(perKmText), (0...100).contains(value) { edited.perKm = value }
        if let value = Self.number(minFeeText), (0...500).contains(value) { edited.minFee = value }
        if let value = Self.number(petrolText), (50...300).contains(value) { edited.petrolPrice = value }
        if let value = Self.number(mileageText), (10...100).contains(value) { edited.mileage = value }
        return edited
    }

    private var nightChargeNote: String {
        let edited = editedNightCharge
        let example = "5 km is ₹\(Int(max(edited.minFee, (5 * edited.perKm).rounded())))"
        switch nightMode {
        case .auto:
            return "From 8 pm to 6 am every day, customers also pay for delivery by distance from the store (\(example)). It is added to the normal delivery fee and charged on free delivery too. Tap Save."
        case .on:
            return "On now and all day, until you change it (\(example)). Tap Save."
        case .off:
            return "Off: customers pay only the normal delivery fee, day and night. Tap Save."
        }
    }
}

// MARK: - Add Supplier Sheet View

struct AddSupplierSheetView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var phone = ""
    @State private var address = ""
    @State private var notes = ""

    var onSave: (String, String, String, String) -> Void

    private var trimmedName: String { name.trimmingCharacters(in: .whitespacesAndNewlines) }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Name", text: $name)
                    TextField("Phone (optional)", text: $phone)
                        .keyboardType(.phonePad)
                    TextField("Address (optional)", text: $address)
                    TextField("Notes (optional)", text: $notes)
                }
            }
            .navigationTitle("Add distributor")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        onSave(trimmedName, phone, address, notes)
                        dismiss()
                    }
                    .disabled(trimmedName.isEmpty)
                }
            }
        }
    }
}

// MARK: - Add Offer Sheet View

struct AddOfferSheetView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var code = ""
    @State private var title = ""
    @State private var discount = "15"
    @State private var minOrder = "199"

    var onSave: (String, String, Int, Double) -> Void

    var body: some View {
        NavigationStack {
            Form {
                Section("Coupon Details") {
                    TextField("Coupon Code (e.g., WELCOME50)", text: $code)
                    TextField("Offer Title", text: $title)
                    TextField("Discount Percentage (%)", text: $discount)
                        .keyboardType(.numberPad)
                    TextField("Minimum Order Value (₹)", text: $minOrder)
                        .keyboardType(.numberPad)
                }
            }
            .navigationTitle("Add Offer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        let discVal = Int(discount) ?? 15
                        let minVal = Double(minOrder) ?? 199.0
                        if !code.isEmpty {
                            onSave(code, title, discVal, minVal)
                            dismiss()
                        }
                    }
                    .disabled(code.isEmpty)
                }
            }
        }
    }
}

// MARK: - Add / Edit Coupon Sheet View

struct AddCouponSheetView: View {
    @ObservedObject var vm: AdminDashboardViewModel
    var editingCoupon: Coupon? = nil
    @Environment(\.dismiss) private var dismiss

    @State private var code: String = ""
    @State private var title: String = ""
    @State private var type: String = "discount" // "discount" | "free_delivery"
    @State private var discount: String = "30"
    @State private var minOrder: String = "199"
    @State private var description: String = ""
    @State private var condition: String = ""
    @State private var active: Bool = true

    init(vm: AdminDashboardViewModel, editingCoupon: Coupon? = nil) {
        self.vm = vm
        self.editingCoupon = editingCoupon
        _code = State(initialValue: editingCoupon?.code ?? "")
        _title = State(initialValue: editingCoupon?.title ?? "")
        let isFreeDel = editingCoupon?.waivesDelivery == true || editingCoupon?.code == "FREEDEL"
        _type = State(initialValue: isFreeDel ? "free_delivery" : "discount")
        _discount = State(initialValue: editingCoupon != nil ? String(Int(editingCoupon!.discount)) : "30")
        _minOrder = State(initialValue: editingCoupon != nil ? String(Int(editingCoupon!.minOrder)) : "199")
        _description = State(initialValue: editingCoupon?.description ?? "")
        _condition = State(initialValue: editingCoupon?.condition ?? "")
        _active = State(initialValue: editingCoupon?.active ?? true)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Coupon Code") {
                    TextField("Code (e.g. WELCOME50)", text: $code)
                        .autocapitalization(.allCharacters)
                        .disableAutocorrection(true)
                        .font(.system(.body, design: .monospaced))

                    Picker("Type", selection: $type) {
                        Text("Discount").tag("discount")
                        Text("Free Delivery").tag("free_delivery")
                    }
                    .pickerStyle(.segmented)

                    if type == "discount" {
                        HStack {
                            Text("Discount Amount")
                            Spacer()
                            TextField("₹", text: $discount)
                                .keyboardType(.numberPad)
                                .multilineTextAlignment(.trailing)
                        }
                    } else {
                        HStack {
                            Text("Delivery Waiver")
                            Spacer()
                            Text("100% Free (₹25 saved)")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(.green)
                        }
                    }

                    HStack {
                        Text("Min Order Value")
                        Spacer()
                        TextField("₹ (0 for none)", text: $minOrder)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                    }
                }

                Section("Offer Details") {
                    TextField("Title (e.g. ₹30 Off on ₹199+)", text: $title)
                    TextField("Description / Subtitle", text: $description)
                    TextField("Condition / Note (e.g. Grocery items)", text: $condition)
                }

                Section {
                    Toggle("Active immediately in checkout", isOn: $active)
                }
            }
            .navigationTitle(editingCoupon != nil ? "Edit Coupon" : "Add Coupon")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(editingCoupon != nil ? "Save" : "Create") {
                        let cleanCode = code.trimmingCharacters(in: .whitespacesAndNewlines)
                            .uppercased()
                            .replacingOccurrences(of: "[^A-Z0-9_-]", with: "", options: .regularExpression)
                        guard !cleanCode.isEmpty else { return }

                        let isFreeDel = type == "free_delivery"
                        let discVal = isFreeDel ? 0.0 : (Double(discount) ?? 0.0)
                        let minVal = Double(minOrder) ?? 0.0
                        let fallbackTitle = isFreeDel
                            ? "100% Free Delivery on your order"
                            : "₹\(Int(discVal)) Off on orders of ₹\(Int(minVal))+"
                        let cleanTitle = title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                            ? fallbackTitle
                            : title.trimmingCharacters(in: .whitespacesAndNewlines)
                        let cleanDesc = description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                            ? "Available at checkout"
                            : description.trimmingCharacters(in: .whitespacesAndNewlines)
                        let cleanCond = condition.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                            ? nil
                            : condition.trimmingCharacters(in: .whitespacesAndNewlines)

                        let coupon = Coupon(
                            id: editingCoupon?.id ?? cleanCode,
                            code: cleanCode,
                            title: cleanTitle,
                            description: cleanDesc,
                            discount: discVal,
                            minOrder: minVal,
                            waivesDelivery: isFreeDel,
                            condition: cleanCond,
                            active: active
                        )
                        vm.saveCoupon(coupon, editingCode: editingCoupon?.code)
                        dismiss()
                    }
                    .disabled(code.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
}

// MARK: - Batch Inward Sheet View

struct BatchInwardSheetView: View {
    @ObservedObject var vm: AdminDashboardViewModel
    @State private var selectedDistributor: String = Distributor.selfName
    @State private var invoiceNumber: String = ""
    @State private var quantities: [String: Int] = [:]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Pick who the stock is from, then add to each item.")
                        .font(.system(size: 13))
                        .foregroundColor(.secondary)

                    Picker("From", selection: $selectedDistributor) {
                        ForEach(vm.distributors) { d in
                            Text(d.name).tag(d.name)
                        }
                    }
                    .pickerStyle(.menu)

                    TextField("Bill number (optional)", text: $invoiceNumber)
                        .textFieldStyle(.roundedBorder)
                }
                .padding(14)
                .background(Color(uiColor: .secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12))

                let supplierProducts = vm.products.filter { Distributor.resolvedName($0.distributor) == selectedDistributor }

                ForEach(supplierProducts) { prod in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(prod.name)
                                .font(.system(size: 13, weight: .semibold))
                            Text(prod.stock.map { "In stock: \($0)" } ?? "Not counted yet")
                                .font(.system(size: 11))
                                .foregroundColor(.secondary)
                        }
                        Spacer()

                        let currentAdd = quantities[prod.id] ?? 0
                        HStack(spacing: 6) {
                            Button("+10") { quantities[prod.id] = currentAdd + 10 }
                                .font(.system(size: 11, weight: .bold))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.orange.opacity(0.15))
                                .clipShape(Capsule())

                            Button("+50") { quantities[prod.id] = currentAdd + 50 }
                                .font(.system(size: 11, weight: .bold))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.orange.opacity(0.15))
                                .clipShape(Capsule())

                            Text("+\(currentAdd)")
                                .font(.system(size: 13, weight: .bold))
                                .frame(minWidth: 35)
                        }
                    }
                    .padding(10)
                    .background(Color(uiColor: .secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }

                Button(action: {
                    vm.processBatchInward(distributor: selectedDistributor, invoice: invoiceNumber, increments: quantities)
                    quantities.removeAll()
                }) {
                    Text("Save stock")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.orange)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .padding(.top, 10)
            }
            .padding(16)
        }
    }
}

// MARK: - Reject Order Sheet View

struct RejectOrderSheetView: View {
    let order: Order
    @ObservedObject var vm: AdminDashboardViewModel
    var title: String = "Cancel / Reject Order"
    var onDone: (() -> Void)? = nil
    @Environment(\.dismiss) private var dismiss

    @State private var selectedPreset: String = "Items out of stock"
    @State private var customReason: String = ""

    private let presets = [
        "Items out of stock",
        "Delivery address unserviceable / out of zone",
        "Dark store operations paused",
        "Customer unreachable / phone switched off",
        "Customer requested cancellation",
        "Duplicate order placed"
    ]

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Order #\(order.id.suffix(6).uppercased())")
                            .font(.system(size: 15, weight: .bold, design: .monospaced))
                        Text("\(order.items.count) items • ₹\(Int(order.grandTotal))")
                            .font(.system(size: 13))
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 2)
                }

                Section(
                    header: Text("Reason for Cancellation / Rejection"),
                    footer: Text("The customer will see this reason in their live tracking and order history.")
                ) {
                    ForEach(presets, id: \.self) { preset in
                        Button(action: {
                            selectedPreset = preset
                            customReason = ""
                        }) {
                            HStack {
                                Text(preset)
                                    .foregroundColor(.primary)
                                    .font(.system(size: 14, weight: selectedPreset == preset && customReason.isEmpty ? .bold : .regular))
                                Spacer()
                                if selectedPreset == preset && customReason.isEmpty {
                                    Image(systemName: "checkmark")
                                        .foregroundColor(.red)
                                        .font(.system(size: 13, weight: .bold))
                                }
                            }
                        }
                    }

                    TextField("Or enter custom reason...", text: $customReason)
                        .font(.system(size: 14))
                }

                Section {
                    Button(role: .destructive, action: {
                        let trimmed = customReason.trimmingCharacters(in: .whitespacesAndNewlines)
                        let finalReason = trimmed.isEmpty ? selectedPreset : trimmed
                        vm.rejectOrder(order: order, reason: finalReason)
                        onDone?()
                        dismiss()
                    }) {
                        HStack {
                            Spacer()
                            Label("Confirm Cancellation / Rejection", systemImage: "xmark.circle.fill")
                                .font(.system(size: 15, weight: .bold))
                            Spacer()
                        }
                    }
                }
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Keep Order") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }
}

typealias CancelOrderSheetView = RejectOrderSheetView

