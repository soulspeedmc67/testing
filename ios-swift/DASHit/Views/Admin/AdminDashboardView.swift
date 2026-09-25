import SwiftUI

public struct AdminDashboardView: View {
    @StateObject private var viewModel = AdminDashboardViewModel.shared
    @State private var selectedTab: AdminTab = .inventory
    @State private var isAddSupplierSheetOpen = false
    @State private var productToDelete: Product? = nil
    @State private var isDeleteConfirmOpen = false

    var onSwitchToCustomer: () -> Void

    public init(onSwitchToCustomer: @escaping () -> Void = {}) {
        self.onSwitchToCustomer = onSwitchToCustomer
    }

    public enum AdminTab: String, CaseIterable, Identifiable {
        case inventory = "Stock & Items"
        case distributors = "Suppliers"
        case orders = "Live Orders"

        public var id: String { rawValue }
        public var icon: String {
            switch self {
            case .inventory: return "shippingbox.fill"
            case .distributors: return "building.2.crop.circle.fill"
            case .orders: return "bag.badge.clock.fill"
            }
        }
    }

    public var body: some View {
        NavigationStack {
            ZStack {
                Color(uiColor: .systemGroupedBackground).ignoresSafeArea()

                VStack(spacing: 0) {
                    // Custom iOS Top Header
                    headerBar

                    // Metrics Strip
                    metricsStrip
                        .padding(.top, 8)
                        .padding(.bottom, 6)

                    // Tab Selector
                    tabSelector
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)

                    // Tab Content
                    TabView(selection: $selectedTab) {
                        inventoryView
                            .tag(AdminTab.inventory)

                        distributorsView
                            .tag(AdminTab.distributors)

                        ordersView
                            .tag(AdminTab.orders)
                    }
                    .tabViewStyle(.page(indexDisplayMode: .never))
                }
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $isAddSupplierSheetOpen) {
                AddSupplierSheetView { name, contact, phone, cat, lead, notes in
                    viewModel.addDistributor(name: name, contact: contact, phone: phone, category: cat, leadTime: lead, notes: notes)
                }
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
            }
            .confirmationDialog(
                "Delete Product from Inventory?",
                isPresented: $isDeleteConfirmOpen,
                presenting: productToDelete
            ) { product in
                Button("Delete '\(product.name)'", role: .destructive) {
                    viewModel.deleteProduct(productId: product.id)
                }
                Button("Cancel", role: .cancel) {}
            } message: { product in
                Text("This will permanently remove \(product.name) from catalog and active inventory.")
            }
        }
    }

    // MARK: - Header Bar

    private var headerBar: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text("DASHIT Admin")
                        .font(.system(size: 22, weight: .bold, design: .rounded))
                        .foregroundColor(.primary)

                    HStack(spacing: 4) {
                        Circle()
                            .fill(Color.green)
                            .frame(width: 8, height: 8)
                        Text("Live Sync")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.green)
                    }
                    .padding(.horizontal, 7)
                    .padding(.vertical, 3)
                    .background(Color.green.opacity(0.12))
                    .clipShape(Capsule())
                }

                Text("Dark Store Hub • Anantnag")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.secondary)
            }

            Spacer()

            Button(action: {
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                onSwitchToCustomer()
            }) {
                HStack(spacing: 4) {
                    Image(systemName: "cart.fill")
                        .font(.system(size: 12, weight: .bold))
                    Text("Shop View")
                        .font(.system(size: 13, weight: .semibold))
                }
                .foregroundColor(.white)
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .background(Color.accentColor)
                .clipShape(Capsule())
                .shadow(color: Color.accentColor.opacity(0.3), radius: 6, y: 2)
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 10)
        .padding(.bottom, 6)
        .background(Color(uiColor: .secondarySystemGroupedBackground))
    }

    // MARK: - Metrics Strip

    private var metricsStrip: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                metricCard(
                    title: "Active SKUs",
                    value: "\(viewModel.totalProductsCount)",
                    icon: "tag.fill",
                    color: .blue
                )
                metricCard(
                    title: "Total Units",
                    value: "\(viewModel.totalStockUnits)",
                    icon: "shippingbox.fill",
                    color: .purple
                )
                metricCard(
                    title: "Valuation",
                    value: "₹\(Int(viewModel.totalStockValuation))",
                    icon: "indianrupeesign.circle.fill",
                    color: .green
                )
                metricCard(
                    title: "Low Stock",
                    value: "\(viewModel.lowStockCount)",
                    icon: "exclamationmark.triangle.fill",
                    color: viewModel.lowStockCount > 0 ? .orange : .gray
                )
            }
            .padding(.horizontal, 16)
        }
    }

    private func metricCard(title: String, value: String, icon: String, color: Color) -> some View {
        HStack(spacing: 10) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.15))
                    .frame(width: 36, height: 36)
                Image(systemName: icon)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(color)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(value)
                    .font(.system(size: 17, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)
                Text(title)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.secondary)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .shadow(color: Color.black.opacity(0.03), radius: 4, y: 1)
    }

    // MARK: - Tab Selector

    private var tabSelector: some View {
        HStack(spacing: 6) {
            ForEach(AdminTab.allCases) { tab in
                Button(action: {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                        selectedTab = tab
                    }
                }) {
                    HStack(spacing: 6) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 13, weight: .bold))
                        Text(tab.rawValue)
                            .font(.system(size: 13, weight: .semibold))
                    }
                    .foregroundColor(selectedTab == tab ? .white : .primary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(
                        selectedTab == tab
                            ? Color.accentColor
                            : Color(uiColor: .secondarySystemGroupedBackground)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
            }
        }
    }

    // MARK: - Inventory View

    private var inventoryView: some View {
        VStack(spacing: 8) {
            // Search and Filter Bar
            HStack(spacing: 8) {
                HStack(spacing: 6) {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.secondary)
                    TextField("Search stock or barcode...", text: $viewModel.searchQuery)
                        .font(.system(size: 14))
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 8)
                .background(Color(uiColor: .secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

                Menu {
                    ForEach(AdminSortOption.allCases) { option in
                        Button(action: {
                            viewModel.sortOption = option
                        }) {
                            HStack {
                                Text(option.rawValue)
                                if viewModel.sortOption == option {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                    }
                } label: {
                    Image(systemName: "arrow.up.arrow.down.circle.fill")
                        .font(.system(size: 24))
                        .foregroundColor(.accentColor)
                }
            }
            .padding(.horizontal, 16)

            // Supplier Filter Chips
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    filterChip(title: "All Suppliers", isSelected: viewModel.selectedDistributor == nil) {
                        viewModel.selectedDistributor = nil
                    }

                    ForEach(viewModel.distributors) { dist in
                        filterChip(title: dist.name, isSelected: viewModel.selectedDistributor == dist.name) {
                            viewModel.selectedDistributor = dist.name
                        }
                    }
                }
                .padding(.horizontal, 16)
            }
            .padding(.bottom, 4)

            // Stock Product List
            List {
                ForEach(viewModel.filteredProducts) { product in
                    stockRow(for: product)
                        .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                            Button(role: .destructive) {
                                productToDelete = product
                                isDeleteConfirmOpen = true
                            } label: {
                                Label("Delete", systemImage: "trash.fill")
                            }
                        }
                }
            }
            .listStyle(.plain)
            .refreshable {
                viewModel.startListeners()
            }
        }
    }

    private func filterChip(title: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            action()
        }) {
            Text(title)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(isSelected ? .white : .primary)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(isSelected ? Color.accentColor : Color(uiColor: .secondarySystemGroupedBackground))
                .clipShape(Capsule())
        }
    }

    private func stockRow(for product: Product) -> some View {
        HStack(spacing: 12) {
            // Product Image Thumbnail
            AsyncImage(url: URL(string: product.img)) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                default:
                    Image(systemName: "bag.fill")
                        .foregroundColor(.gray.opacity(0.5))
                }
            }
            .frame(width: 48, height: 48)
            .background(Color(uiColor: .systemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

            // Details
            VStack(alignment: .leading, spacing: 3) {
                Text(product.name)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.primary)
                    .lineLimit(1)

                HStack(spacing: 6) {
                    Text("₹\(Int(product.price))")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.primary)

                    Text("•")
                        .foregroundColor(.secondary)

                    Text(product.unit)
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                }

                // Distributor Attribution Badge
                HStack(spacing: 4) {
                    Image(systemName: "building.2.fill")
                        .font(.system(size: 9))
                    Text(product.distributor ?? "Kashmir Wholesale FMCG")
                        .font(.system(size: 10, weight: .medium))
                        .lineLimit(1)
                }
                .foregroundColor(.accentColor)
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(Color.accentColor.opacity(0.1))
                .clipShape(Capsule())
            }

            Spacer()

            // Stock Stepper Control
            VStack(alignment: .trailing, spacing: 4) {
                HStack(spacing: 8) {
                    Button(action: {
                        let current = product.stock ?? 10
                        if current > 0 {
                            viewModel.updateStock(productId: product.id, newStock: current - 1)
                        }
                    }) {
                        Image(systemName: "minus")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.primary)
                            .frame(width: 28, height: 28)
                            .background(Color(uiColor: .systemBackground))
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)

                    Text("\(product.stock ?? 10)")
                        .font(.system(size: 15, weight: .bold, design: .rounded))
                        .foregroundColor((product.stock ?? 10) < 5 ? .orange : .primary)
                        .frame(minWidth: 24)

                    Button(action: {
                        let current = product.stock ?? 10
                        viewModel.updateStock(productId: product.id, newStock: current + 1)
                    }) {
                        Image(systemName: "plus")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.white)
                            .frame(width: 28, height: 28)
                            .background(Color.green)
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                }
                .padding(4)
                .background(Color(uiColor: .tertiarySystemGroupedBackground))
                .clipShape(Capsule())

                Button(action: {
                    productToDelete = product
                    isDeleteConfirmOpen = true
                }) {
                    Image(systemName: "trash")
                        .font(.system(size: 11))
                        .foregroundColor(.red.opacity(0.8))
                }
                .buttonStyle(.plain)
                .padding(.top, 2)
            }
        }
        .padding(12)
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .shadow(color: Color.black.opacity(0.02), radius: 4, y: 1)
    }

    // MARK: - Distributors View

    private var distributorsView: some View {
        ScrollView {
            VStack(spacing: 12) {
                // Add Distributor Banner
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Wholesale Suppliers & Shops")
                            .font(.system(size: 16, weight: .bold))
                        Text("Attribution, valuation & restock tracking")
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    Button(action: {
                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                        isAddSupplierSheetOpen = true
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: "plus")
                                .font(.system(size: 12, weight: .bold))
                            Text("Add")
                                .font(.system(size: 13, weight: .semibold))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 7)
                        .background(Color.green)
                        .clipShape(Capsule())
                    }
                }
                .padding(14)
                .background(Color(uiColor: .secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                // Supplier Breakdown Cards
                ForEach(viewModel.supplierStats) { stat in
                    supplierBreakdownCard(stat: stat)
                }
            }
            .padding(16)
        }
    }

    private func supplierBreakdownCard(stat: SupplierStat) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(stat.name)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.primary)

                    Text(stat.category)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.secondary)
                }

                Spacer()

                if let url = URL(string: "tel:\(stat.phone.replacingOccurrences(of: " ", with: ""))") {
                    Link(destination: url) {
                        HStack(spacing: 4) {
                            Image(systemName: "phone.fill")
                                .font(.system(size: 11))
                            Text("Call")
                                .font(.system(size: 12, weight: .semibold))
                        }
                        .foregroundColor(.green)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(Color.green.opacity(0.12))
                        .clipShape(Capsule())
                    }
                }
            }

            Divider()

            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Total Stock")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(.secondary)
                    Text("\(stat.totalUnits) units")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.primary)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text("Inventory Value")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(.secondary)
                    Text("₹\(Int(stat.totalValue))")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.green)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text("Catalog SKUs")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(.secondary)
                    Text("\(stat.skuCount) items")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.primary)
                }

                Spacer()

                Button(action: {
                    viewModel.selectedDistributor = stat.name
                    withAnimation { selectedTab = .inventory }
                }) {
                    Text("View Stock →")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.accentColor)
                }
            }
        }
        .padding(14)
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .shadow(color: Color.black.opacity(0.02), radius: 4, y: 1)
    }

    // MARK: - Orders View

    private var ordersView: some View {
        ScrollView {
            VStack(spacing: 12) {
                if viewModel.recentOrders.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "tray.fill")
                            .font(.system(size: 40))
                            .foregroundColor(.secondary.opacity(0.5))
                        Text("No live orders currently")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 60)
                } else {
                    ForEach(viewModel.recentOrders) { order in
                        orderCard(for: order)
                    }
                }
            }
            .padding(16)
        }
    }

    private func orderCard(for order: Order) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Order #\(order.id.prefix(8).uppercased())")
                    .font(.system(size: 15, weight: .bold, design: .monospaced))

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
                Text("\(order.items.count) item(s)")
                    .font(.system(size: 13, weight: .medium))

                Spacer()

                Text("₹\(Int(order.grandTotal))")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.primary)
            }

            if !order.status.stage.isFinished {
                Button(action: {
                    viewModel.advanceOrderStatus(order: order)
                }) {
                    HStack {
                        Image(systemName: "arrow.right.circle.fill")
                        Text(nextActionTitle(for: order.status.stage))
                    }
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(Color.accentColor)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
            }
        }
        .padding(14)
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
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

    private func nextActionTitle(for stage: DeliveryStage) -> String {
        switch stage {
        case .placed: return "Start Packing"
        case .packing: return "Dispatch with Rider"
        case .onTheWay: return "Confirm Delivered"
        default: return "Update"
        }
    }
}

// MARK: - Add Supplier Sheet

struct AddSupplierSheetView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var contact = ""
    @State private var phone = ""
    @State private var category = "Wholesale Staples"
    @State private var leadTime = "1 day"
    @State private var notes = ""

    var onSave: (String, String, String, String, String, String) -> Void

    let categories = [
        "Wholesale Staples", "Fresh Dairy", "Artisan Bakery",
        "Valley Produce", "Personal & Home Care", "Packaged Foods",
        "Local Partner Shopkeeper"
    ]

    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Supplier Details")) {
                    TextField("Company / Shop Name", text: $name)
                    TextField("Contact Person", text: $contact)
                    TextField("Phone Number", text: $phone)
                        .keyboardType(.phonePad)
                }

                Section(header: Text("Categorization & Delivery")) {
                    Picker("Category", selection: $category) {
                        ForEach(categories, id: \.self) {
                            Text($0)
                        }
                    }
                    TextField("Lead Time (e.g. 1-2 days)", text: $leadTime)
                    TextField("Notes / Address", text: $notes)
                }
            }
            .navigationTitle("Add New Supplier")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        if !name.trimmingCharacters(in: .whitespaces).isEmpty {
                            onSave(name, contact, phone, category, leadTime, notes)
                            dismiss()
                        }
                    }
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }
}
