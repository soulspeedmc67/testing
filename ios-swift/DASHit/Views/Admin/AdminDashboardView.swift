import SwiftUI
import AudioToolbox

public struct AdminDashboardView: View {
    @StateObject private var vm = AdminDashboardViewModel.shared

    // Navigation and Sheet Modals
    @State private var selectedOrderForDetail: Order? = nil
    @State private var selectedOrderForDriver: Order? = nil
    @State private var isAddSupplierSheetOpen: Bool = false
    @State private var isAddProductSheetOpen: Bool = false
    @State private var isAddDriverSheetOpen: Bool = false
    @State private var isStoreControlSheetOpen: Bool = false
    @State private var isAddOfferSheetOpen: Bool = false
    @State private var isBatchInwardSheetOpen: Bool = false
    @State private var productToDelete: Product? = nil
    @State private var productToEdit: Product? = nil
    @State private var distributorToRemove: Distributor? = nil

    public var onSwitchToCustomer: (() -> Void)? = nil

    public init(onSwitchToCustomer: (() -> Void)? = nil) {
        self.onSwitchToCustomer = onSwitchToCustomer
    }

    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Frosted Live Header
                headerView

                // Segmented Category Tabs
                tabSelectorView

                // Main Content Body based on selected Tab
                ZStack {
                    Color(uiColor: .systemGroupedBackground)
                        .ignoresSafeArea()

                    switch vm.selectedTab {
                    case .orders:
                        ordersTabContent
                    case .inventory:
                        stockTabContent
                    case .addProduct:
                        addProductDirectContent
                    case .riders:
                        ridersTabContent
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
            }
            .navigationBarHidden(true)
            .sheet(item: $selectedOrderForDetail) { order in
                OrderDetailSheetView(order: order, vm: vm)
            }
            .sheet(item: $selectedOrderForDriver) { order in
                AssignDriverSheetView(order: order, vm: vm)
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
                AddDriverSheetView { name, phone, vehicle in
                    vm.addDriver(name: name, phone: phone, vehicle: vehicle)
                }
            }
            .sheet(isPresented: $isStoreControlSheetOpen) {
                StoreControlSheetView(vm: vm)
            }
            .sheet(isPresented: $isAddOfferSheetOpen) {
                AddOfferSheetView { code, title, discount, minOrder in
                    vm.addOffer(code: code, title: title, discountPercent: discount, minOrder: minOrder)
                }
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
    }

    // MARK: - Header View

    private var headerView: some View {
        VStack(spacing: 8) {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text("DASHIT PARTNER")
                            .font(.system(size: 11, weight: .black, design: .rounded))
                            .tracking(1.2)
                            .foregroundColor(.orange)

                        Circle()
                            .fill(Color.green)
                            .frame(width: 7, height: 7)
                        Text("LIVE")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.green)
                    }

                    Text("Dark Store Operations")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(.primary)
                }

                Spacer()

                // Audio Chime Toggle
                Button(action: {
                    vm.audioChimeEnabled.toggle()
                    if vm.audioChimeEnabled { vm.playOrderChime() }
                }) {
                    Image(systemName: vm.audioChimeEnabled ? "bell.badge.fill" : "bell.slash.fill")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(vm.audioChimeEnabled ? .orange : .secondary)
                        .padding(8)
                        .background(Color(uiColor: .tertiarySystemFill))
                        .clipShape(Circle())
                }

                // Store Status Button
                Button(action: { isStoreControlSheetOpen = true }) {
                    HStack(spacing: 5) {
                        Circle()
                            .fill(vm.storeConfig.isOpen ? Color.green : Color.red)
                            .frame(width: 8, height: 8)
                        Text(vm.storeConfig.isOpen ? "Open" : "Closed")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(vm.storeConfig.isOpen ? .green : .red)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background((vm.storeConfig.isOpen ? Color.green : Color.red).opacity(0.12))
                    .clipShape(Capsule())
                }

                // Customer View Toggle
                if let onSwitch = onSwitchToCustomer {
                    Button(action: onSwitch) {
                        Image(systemName: "cart.fill")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.primary)
                            .padding(8)
                            .background(Color(uiColor: .secondarySystemFill))
                            .clipShape(Circle())
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 10)
            .padding(.bottom, 6)
        }
        .background(Color(uiColor: .secondarySystemGroupedBackground))
    }

    // MARK: - Tab Selector View

    private var tabSelectorView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(AdminTab.allCases) { tab in
                    let isSelected = vm.selectedTab == tab
                    Button(action: {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                            vm.selectedTab = tab
                        }
                    }) {
                        HStack(spacing: 6) {
                            Image(systemName: tab.iconName)
                                .font(.system(size: 12, weight: .bold))
                            Text(tab.rawValue)
                                .font(.system(size: 13, weight: .bold))

                            // Badges
                            if tab == .orders && vm.activeOrdersCount > 0 {
                                Text("\(vm.activeOrdersCount)")
                                    .font(.system(size: 10, weight: .black))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 5)
                                    .padding(.vertical, 2)
                                    .background(Color.orange)
                                    .clipShape(Capsule())
                            } else if tab == .inventory && vm.lowStockCount > 0 {
                                Text("\(vm.lowStockCount)")
                                    .font(.system(size: 10, weight: .black))
                                    .foregroundColor(.black)
                                    .padding(.horizontal, 5)
                                    .padding(.vertical, 2)
                                    .background(Color.yellow)
                                    .clipShape(Capsule())
                            }
                        }
                        .foregroundColor(isSelected ? .white : .primary)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(isSelected ? Color.orange : Color(uiColor: .tertiarySystemFill))
                        .clipShape(Capsule())
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
        }
        .background(Color(uiColor: .secondarySystemGroupedBackground))
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

                Spacer()

                Text(order.status.stage.label)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(stageColor(order.status.stage))
                    .clipShape(Capsule())
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
                    Button(action: { vm.advanceOrderStatus(order: order) }) {
                        Label("Start Packing", systemImage: "shippingbox.fill")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(Color.blue)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                } else if order.status.stage == .packing {
                    Button(action: { selectedOrderForDriver = order }) {
                        Label("Assign Rider", systemImage: "scooter")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(Color.purple)
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
                }
            }
        }
        .padding(14)
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14))
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

                Text("\(product.stock ?? 10)")
                    .font(.system(size: 14, weight: .bold))
                    .frame(minWidth: 26)

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
        AddProductSheetView(vm: vm, editingProduct: nil)
    }

    // MARK: - Tab 4: Riders Content

    private var ridersTabContent: some View {
        ScrollView {
            VStack(spacing: 14) {
                HStack {
                    Text("Delivery Fleet (\(vm.drivers.count))")
                        .font(.system(size: 18, weight: .bold))
                    Spacer()
                    Button("+ Register Rider") {
                        isAddDriverSheetOpen = true
                    }
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.orange)
                }
                .padding(.horizontal, 16)
                .padding(.top, 14)

                LazyVStack(spacing: 12) {
                    ForEach(vm.drivers) { driver in
                        driverCard(driver: driver)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 30)
            }
        }
    }

    private func driverCard(driver: Driver) -> some View {
        HStack(spacing: 12) {
            Image(systemName: "person.circle.fill")
                .font(.system(size: 40))
                .foregroundColor(.purple)

            VStack(alignment: .leading, spacing: 3) {
                Text(driver.name)
                    .font(.system(size: 15, weight: .bold))
                Text("\(driver.vehicle) • ★ \(String(format: "%.1f", driver.rating))")
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
            }

            Spacer()

            if let url = URL(string: "tel:\(driver.phone.filter { "0123456789+".contains($0) })") {
                Link(destination: url) {
                    Image(systemName: "phone.fill")
                        .font(.system(size: 14))
                        .foregroundColor(.green)
                        .padding(10)
                        .background(Color.green.opacity(0.12))
                        .clipShape(Circle())
                }
            }
        }
        .padding(14)
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
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
        StoreControlSheetView(vm: vm)
    }

    // MARK: - Tab 7: Discounts Content

    private var offersTabContent: some View {
        ScrollView {
            VStack(spacing: 14) {
                HStack {
                    Text("Promotions & Offers (\(vm.offers.count))")
                        .font(.system(size: 18, weight: .bold))
                    Spacer()
                    Button("+ Add Offer") {
                        isAddOfferSheetOpen = true
                    }
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.orange)
                }
                .padding(.horizontal, 16)
                .padding(.top, 14)

                LazyVStack(spacing: 12) {
                    ForEach(vm.offers) { offer in
                        offerCard(offer: offer)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 30)
            }
        }
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

struct OrderDetailSheetView: View {
    let order: Order
    @ObservedObject var vm: AdminDashboardViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView(.vertical, showsIndicators: true) {
                VStack(alignment: .leading, spacing: 16) {
                    // Status Header Card
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Order #\(order.id.uppercased())")
                            .font(.system(size: 18, weight: .bold, design: .monospaced))
                        Text("Stage: \(order.status.stage.label)")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.orange)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(16)
                    .background(Color(uiColor: .secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                    // Customer Address Card
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Delivery Destination")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.secondary)
                        Text(order.deliveryAddress.formattedSummary)
                            .font(.system(size: 14))
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(16)
                    .background(Color(uiColor: .secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                    // Items List
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Order Items (\(order.items.count))")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.secondary)

                        ForEach(order.items) { item in
                            HStack {
                                Text("\(item.quantity)x \(item.name)")
                                    .font(.system(size: 14))
                                Spacer()
                                Text("₹\(Int(item.price * Double(item.quantity)))")
                                    .font(.system(size: 14, weight: .semibold))
                            }
                            Divider()
                        }

                        HStack {
                            Text("Grand Total")
                                .font(.system(size: 16, weight: .bold))
                            Spacer()
                            Text("₹\(Int(order.grandTotal))")
                                .font(.system(size: 18, weight: .black))
                                .foregroundColor(.orange)
                        }
                    }
                    .padding(16)
                    .background(Color(uiColor: .secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                    // Advance Status Button
                    Button(action: {
                        vm.advanceOrderStatus(order: order)
                        dismiss()
                    }) {
                        Text("Advance Order Stage")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.orange)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                    // Cancel Order Button
                    Button(action: {
                        vm.cancelOrder(order: order)
                        dismiss()
                    }) {
                        Text("Cancel Order")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.red)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                    }
                }
                .padding(16)
            }
            .navigationTitle("Order Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }
}

// MARK: - Assign Driver Sheet View

struct AssignDriverSheetView: View {
    let order: Order
    @ObservedObject var vm: AdminDashboardViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List(vm.drivers) { driver in
                Button(action: {
                    vm.assignDriver(orderId: order.id, driver: driver)
                    dismiss()
                }) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(driver.name)
                                .font(.system(size: 15, weight: .bold))
                                .foregroundColor(.primary)
                            Text("\(driver.vehicle) • \(driver.status.capitalized)")
                                .font(.system(size: 12))
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .foregroundColor(.secondary)
                    }
                }
            }
            .navigationTitle("Assign Rider")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}

// MARK: - Add / Edit Product Sheet View

struct AddProductSheetView: View {
    @ObservedObject var vm: AdminDashboardViewModel
    var editingProduct: Product?
    @Environment(\.dismiss) private var dismiss

    @State private var name: String = ""
    @State private var unit: String = "1 kg"
    @State private var price: String = "99"
    @State private var originalPrice: String = "120"
    @State private var cat: String = "Staples"
    @State private var distributor: String = Distributor.selfName
    @State private var img: String = ""
    @State private var stock: String = "50"
    @State private var badge: String = ""

    let categories = ["Staples", "Dairy", "Bakery", "Fruits", "Chips", "Biscuits", "Beverages", "Instant Food", "Spices", "Personal Care"]

    var body: some View {
        NavigationStack {
            Form {
                Section("Basic Information") {
                    TextField("Product Title", text: $name)
                    TextField("Unit Size (e.g., 1 kg, 500 ml)", text: $unit)
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

                Section("Pricing & Inventory") {
                    TextField("Selling Price (₹)", text: $price)
                        .keyboardType(.numberPad)
                    TextField("MRP / Original Price (₹)", text: $originalPrice)
                        .keyboardType(.numberPad)
                    TextField("Initial Stock Count", text: $stock)
                        .keyboardType(.numberPad)
                    TextField("Badge (e.g., Bestseller, Fresh)", text: $badge)
                }

                Section("Product Photo URL") {
                    TextField("Image HTTPS URL", text: $img)
                    if let url = URL(string: img), !img.isEmpty {
                        AsyncImage(url: url) { phase in
                            if let img = phase.image {
                                img.resizable().scaledToFit().frame(height: 120)
                            }
                        }
                    }
                }
            }
            .navigationTitle(editingProduct != nil ? "Edit Item" : "Add Product")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        let pVal = Double(price) ?? 99.0
                        let origVal = Double(originalPrice)
                        let sVal = Int(stock) ?? 50
                        vm.saveProduct(
                            id: editingProduct?.id,
                            name: name.isEmpty ? "New Grocery Item" : name,
                            unit: unit,
                            price: pVal,
                            originalPrice: origVal,
                            cat: cat,
                            distributor: distributor,
                            img: img,
                            stock: sVal,
                            badge: badge
                        )
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Store Control Sheet View

struct StoreControlSheetView: View {
    @ObservedObject var vm: AdminDashboardViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var isOpen: Bool = true
    @State private var closeReason: String = "Normal Operations"
    @State private var isSurge: Bool = false

    let reasons = ["Normal Operations", "Heavy Rain & Flooding", "Late Night Shift", "Power Outage", "Restocking Inventory"]

    var body: some View {
        NavigationStack {
            Form {
                Section("Store Status") {
                    Toggle("Store Open for Orders", isOn: $isOpen)

                    if !isOpen {
                        Picker("Reason for Closure", selection: $closeReason) {
                            ForEach(reasons, id: \.self) { r in
                                Text(r).tag(r)
                            }
                        }
                    }
                }

                Section("Surge & Peak Demand") {
                    Toggle("Surge Pricing (+₹20 delivery)", isOn: $isSurge)
                }
            }
            .navigationTitle("Store Settings")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear {
                isOpen = vm.storeConfig.isOpen
                closeReason = vm.storeConfig.closeReason
                isSurge = vm.storeConfig.isHighDemand
            }
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        vm.toggleStore(isOpen: isOpen, reason: closeReason)
                        vm.toggleSurgePricing(enabled: isSurge)
                        dismiss()
                    }
                }
            }
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

// MARK: - Add Driver Sheet View

struct AddDriverSheetView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var phone = ""
    @State private var vehicle = "Hero Electric Scooter"

    var onSave: (String, String, String) -> Void

    var body: some View {
        NavigationStack {
            Form {
                Section("Rider Information") {
                    TextField("Full Name", text: $name)
                    TextField("Phone Number", text: $phone)
                        .keyboardType(.phonePad)
                    TextField("Vehicle Type", text: $vehicle)
                }
            }
            .navigationTitle("Register Rider")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        if !name.isEmpty {
                            onSave(name, phone, vehicle)
                            dismiss()
                        }
                    }
                    .disabled(name.isEmpty)
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
                    Text("Add many at once")
                        .font(.system(size: 16, weight: .bold))
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
                            Text("In stock: \(prod.stock ?? 10)")
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
