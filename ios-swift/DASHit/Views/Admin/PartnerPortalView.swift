import SwiftUI
import FirebaseAuth
import FirebaseFirestore

// MARK: - Partner mode
//
// A partner is another shop owner running his own stock on DASHit. He signs in
// to this same app with the email and password DASHit gave him and sees only
// his own shop: partners/{partnerId} and what is under it (firestore.rules,
// "Partners"). He is not staff, so none of the shop's own data is open to him.
// Same screens as the website's /partner portal.

private let partnerOrange = Color(red: 1.0, green: 0.357, blue: 0.0)
private let partnerNavy = Color(red: 0.024, green: 0.094, blue: 0.22)

private func partnerNumber(_ value: Any?) -> Double {
    if let n = value as? NSNumber { return n.doubleValue }
    if let d = value as? Double { return d }
    return 0
}

/// "₹1,23,456", with paise only when there are some.
private func partnerRupees(_ value: Double) -> String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .decimal
    formatter.locale = Locale(identifier: "en_IN")
    formatter.maximumFractionDigits = 2
    formatter.minimumFractionDigits = value.rounded() == value ? 0 : 2
    return "\u{20B9}" + (formatter.string(from: NSNumber(value: value)) ?? String(Int(value)))
}

private func partnerCount(_ value: Double) -> String {
    value.rounded() == value ? String(Int(value)) : String(format: "%.2f", value)
}

enum PartnerStockState { case ok, low, out, hidden }

struct PartnerProduct: Identifiable, Equatable {
    let id: String
    var name: String
    var category: String
    var unit: String
    var price: Double
    var mrp: Double
    var stock: Double
    var lowStockAt: Double
    var active: Bool
    var img: String

    init(id: String, data: [String: Any]) {
        self.id = id
        name = data["name"] as? String ?? ""
        category = data["category"] as? String ?? ""
        unit = data["unit"] as? String ?? ""
        price = partnerNumber(data["price"])
        mrp = partnerNumber(data["mrp"])
        stock = partnerNumber(data["stock"])
        lowStockAt = data["lowStockAt"] == nil ? 5 : partnerNumber(data["lowStockAt"])
        active = (data["active"] as? Bool) ?? true
        img = data["img"] as? String ?? ""
    }

    var state: PartnerStockState {
        if !active { return .hidden }
        if stock <= 0 { return .out }
        return stock <= lowStockAt ? .low : .ok
    }

    var discountPercent: Int {
        mrp > price && price >= 0 ? Int((((mrp - price) / mrp) * 100).rounded()) : 0
    }
}

/// His shop, live from Firestore, and the few writes he is allowed.
@MainActor
final class PartnerStore: ObservableObject {
    let partnerId: String
    @Published var products: [PartnerProduct] = []
    @Published var partnerName = ""
    @Published var maxDeliveryKm: Double = 0
    @Published var shop: [String: Any] = [:]
    @Published var loading = true
    @Published var failed = false
    @Published var message: String?

    private var listeners: [ListenerRegistration] = []

    init(partnerId: String) {
        self.partnerId = partnerId
    }

    private var root: DocumentReference {
        Firestore.firestore().collection("partners").document(partnerId)
    }

    func start() {
        stop()
        listeners.append(root.addSnapshotListener { [weak self] snapshot, _ in
            guard let self, let data = snapshot?.data() else { return }
            Task { @MainActor in
                self.partnerName = data["name"] as? String ?? ""
                self.maxDeliveryKm = partnerNumber(data["maxDeliveryKm"])
            }
        })
        listeners.append(root.collection("settings").document("shop").addSnapshotListener { [weak self] snapshot, _ in
            Task { @MainActor in self?.shop = snapshot?.data() ?? [:] }
        })
        listeners.append(root.collection("products").addSnapshotListener { [weak self] snapshot, error in
            Task { @MainActor in
                guard let self else { return }
                if error != nil {
                    self.failed = true
                    self.loading = false
                    return
                }
                self.failed = false
                self.products = (snapshot?.documents ?? [])
                    .map { PartnerProduct(id: $0.documentID, data: $0.data()) }
                    .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
                self.loading = false
            }
        })
    }

    func stop() {
        listeners.forEach { $0.remove() }
        listeners = []
    }

    func setStock(_ product: PartnerProduct, to value: Double) {
        let clean = max(0, (value * 100).rounded() / 100)
        root.collection("products").document(product.id).updateData([
            "stock": clean,
            "updatedAt": FieldValue.serverTimestamp()
        ]) { [weak self] error in
            if error != nil { Task { @MainActor in self?.message = "Couldn't update that count. Try again." } }
        }
    }

    /// Adds (id == nil) or changes one item. Only the fields the rules allow.
    func save(id: String?, name: String, category: String, unit: String, price: Double, mrp: Double,
              stock: Double, lowStockAt: Double, active: Bool) async throws {
        var fields: [String: Any] = [
            "name": name,
            "category": category,
            "unit": unit,
            "price": price,
            "stock": stock,
            "lowStockAt": lowStockAt,
            "active": active,
            "updatedAt": FieldValue.serverTimestamp()
        ]
        if let id {
            // Clearing the MRP removes it; keeping it sets it.
            if mrp > 0 {
                fields["mrp"] = mrp
            } else {
                fields["mrp"] = FieldValue.delete()
            }
            try await root.collection("products").document(id).updateData(fields)
        } else {
            if mrp > 0 { fields["mrp"] = mrp }
            fields["createdAt"] = FieldValue.serverTimestamp()
            try await root.collection("products").document().setData(fields)
        }
    }

    func delete(_ product: PartnerProduct) async throws {
        try await root.collection("products").document(product.id).delete()
    }

    func saveShop(displayName: String, tagline: String, phone: String, address: String, hours: String, isOpen: Bool) async throws {
        try await root.collection("settings").document("shop").setData([
            "displayName": displayName,
            "tagline": tagline,
            "phone": phone,
            "address": address,
            "hours": hours,
            "isOpen": isOpen,
            "updatedAt": FieldValue.serverTimestamp()
        ], merge: true)
    }
}

// MARK: - Screens

struct PartnerPortalView: View {
    @StateObject private var store: PartnerStore
    let email: String
    let onSignOut: () -> Void

    init(partnerId: String, email: String, onSignOut: @escaping () -> Void) {
        _store = StateObject(wrappedValue: PartnerStore(partnerId: partnerId))
        self.email = email
        self.onSignOut = onSignOut
    }

    var body: some View {
        TabView {
            PartnerOverviewTab(store: store)
                .tabItem { Label("Overview", systemImage: "square.grid.2x2") }
            PartnerStockTab(store: store)
                .tabItem { Label("Stock", systemImage: "shippingbox") }
            PartnerShopTab(store: store)
                .tabItem { Label("My shop", systemImage: "storefront") }
            PartnerAccountTab(store: store, email: email, onSignOut: onSignOut)
                .tabItem { Label("Account", systemImage: "person.crop.circle") }
        }
        .tint(partnerOrange)
        .onAppear { store.start() }
        .onDisappear { store.stop() }
        .alert("DASHit", isPresented: Binding(get: { store.message != nil }, set: { if !$0 { store.message = nil } })) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(store.message ?? "")
        }
    }
}

private struct PartnerKpi: View {
    let title: String
    let value: String
    let note: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(.system(size: 13, weight: .semibold)).foregroundColor(.secondary)
            Text(value).font(.system(size: 26, weight: .heavy)).foregroundColor(partnerNavy).minimumScaleFactor(0.6).lineLimit(1)
            Text(note).font(.system(size: 12)).foregroundColor(.secondary).lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

private struct PartnerOverviewTab: View {
    @ObservedObject var store: PartnerStore

    private var attention: [PartnerProduct] {
        store.products.filter { $0.state == .low || $0.state == .out }.sorted { $0.stock < $1.stock }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    if store.failed {
                        Text("We couldn't load your stock. Check your connection.")
                            .font(.system(size: 14, weight: .semibold)).foregroundColor(.red)
                    }
                    let units = store.products.reduce(0) { $0 + max(0, $1.stock) }
                    let value = store.products.reduce(0) { $0 + max(0, $1.stock) * $1.price }
                    LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
                        PartnerKpi(title: "Items listed", value: String(store.products.count), note: "in your shop")
                        PartnerKpi(title: "Units in stock", value: partnerCount(units), note: "all items")
                        PartnerKpi(title: "Stock value", value: partnerRupees(value), note: "at your prices")
                        PartnerKpi(title: "Needs attention", value: String(attention.count), note: attention.isEmpty ? "all stocked" : "low or out")
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        Text("Needs restocking").font(.system(size: 17, weight: .bold))
                        if attention.isEmpty {
                            Text(store.products.isEmpty ? "Add your first item in the Stock tab." : "Nothing is running low.")
                                .font(.system(size: 14)).foregroundColor(.secondary)
                        }
                        ForEach(attention.prefix(6)) { product in
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(product.name).font(.system(size: 15, weight: .semibold)).lineLimit(1)
                                    Text(product.state == .out ? "Out of stock" : "\(partnerCount(product.stock)) left")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundColor(product.state == .out ? .red : .orange)
                                }
                                Spacer()
                                Button("+10") { store.setStock(product, to: product.stock + 10) }
                                    .buttonStyle(.bordered)
                            }
                            .padding(12)
                            .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        }
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Label("Your delivery area", systemImage: "mappin.and.ellipse").font(.system(size: 17, weight: .bold))
                        Text("Customers up to \(partnerCount(store.maxDeliveryKm)) km from your shop can order from you. DASHit sets this with you; to change it, contact DASHit.")
                            .font(.system(size: 14)).foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(14)
                    .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16, style: .continuous))

                    VStack(alignment: .leading, spacing: 6) {
                        Label("Orders: coming soon", systemImage: "bag").font(.system(size: 17, weight: .bold))
                        Text("Orders from customers in your area will appear here once ordering opens for your shop.")
                            .font(.system(size: 14)).foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(14)
                    .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .padding(16)
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .navigationTitle(store.partnerName.isEmpty ? "Your shop" : store.partnerName)
        }
    }
}

private struct PartnerStockTab: View {
    @ObservedObject var store: PartnerStore
    @State private var search = ""
    @State private var filter = 0
    @State private var editing: PartnerProduct?
    @State private var adding = false

    private var shown: [PartnerProduct] {
        store.products.filter { product in
            if !search.isEmpty, !product.name.localizedCaseInsensitiveContains(search), !product.category.localizedCaseInsensitiveContains(search) { return false }
            switch filter {
            case 1: return product.state == .low || product.state == .out
            case 2: return product.state == .out
            case 3: return product.state == .hidden
            default: return true
            }
        }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Picker("Filter", selection: $filter) {
                        Text("All").tag(0)
                        Text("Attention").tag(1)
                        Text("Out").tag(2)
                        Text("Hidden").tag(3)
                    }
                    .pickerStyle(.segmented)
                }
                if store.loading {
                    ProgressView().frame(maxWidth: .infinity)
                } else if shown.isEmpty {
                    Text(store.products.isEmpty ? "Add your first item with the + button." : "Nothing matches.")
                        .foregroundColor(.secondary)
                }
                ForEach(shown) { product in
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(product.name).font(.system(size: 15, weight: .semibold)).lineLimit(2)
                            HStack(spacing: 6) {
                                Text(partnerRupees(product.price)).font(.system(size: 13, weight: .bold)).foregroundColor(partnerNavy)
                                if product.discountPercent > 0 {
                                    Text("\(product.discountPercent)% off").font(.system(size: 12, weight: .semibold)).foregroundColor(.green)
                                }
                                if product.state == .out { Text("Out").font(.system(size: 12, weight: .bold)).foregroundColor(.red) }
                                if product.state == .low { Text("Low").font(.system(size: 12, weight: .bold)).foregroundColor(.orange) }
                                if product.state == .hidden { Text("Hidden").font(.system(size: 12, weight: .bold)).foregroundColor(.secondary) }
                            }
                        }
                        Spacer()
                        HStack(spacing: 4) {
                            Button { store.setStock(product, to: product.stock - 1) } label: { Image(systemName: "minus.circle.fill") }
                                .buttonStyle(.borderless)
                            Text(partnerCount(product.stock)).font(.system(size: 16, weight: .heavy)).frame(minWidth: 34)
                            Button { store.setStock(product, to: product.stock + 1) } label: { Image(systemName: "plus.circle.fill") }
                                .buttonStyle(.borderless)
                        }
                        .font(.system(size: 24))
                        .foregroundColor(partnerOrange)
                    }
                    .contentShape(Rectangle())
                    .onTapGesture { editing = product }
                }
            }
            .searchable(text: $search, prompt: "Search your items")
            .navigationTitle("Stock")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { adding = true } label: { Image(systemName: "plus") }
                }
            }
            .sheet(isPresented: $adding) { PartnerProductForm(store: store, product: nil) }
            .sheet(item: $editing) { product in PartnerProductForm(store: store, product: product) }
        }
    }
}

private struct PartnerProductForm: View {
    @ObservedObject var store: PartnerStore
    let product: PartnerProduct?
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var category = ""
    @State private var unit = ""
    @State private var price = ""
    @State private var mrp = ""
    @State private var stock = ""
    @State private var lowAt = ""
    @State private var active = true
    @State private var error: String?
    @State private var busy = false
    @State private var confirmDelete = false

    var body: some View {
        NavigationStack {
            Form {
                if let error { Text(error).foregroundColor(.red).font(.system(size: 14, weight: .semibold)) }
                Section("Item") {
                    TextField("Name", text: $name)
                    TextField("Category", text: $category)
                    TextField("Unit (e.g. 5 kg)", text: $unit)
                }
                Section("Price and stock") {
                    TextField("Selling price (\u{20B9})", text: $price).keyboardType(.decimalPad)
                    TextField("MRP (\u{20B9}), optional", text: $mrp).keyboardType(.decimalPad)
                    TextField("In stock", text: $stock).keyboardType(.decimalPad)
                    TextField("Warn me at (default 5)", text: $lowAt).keyboardType(.decimalPad)
                }
                Section {
                    Toggle("Show to customers", isOn: $active)
                }
                if product != nil {
                    Section {
                        Button("Remove this item", role: .destructive) { confirmDelete = true }
                    }
                }
            }
            .navigationTitle(product == nil ? "Add an item" : "Edit item")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(busy ? "Saving…" : "Save") { Task { await save() } }.disabled(busy)
                }
            }
            .confirmationDialog("Remove this item? This can't be undone.", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Remove", role: .destructive) {
                    guard let product else { return }
                    Task {
                        do { try await store.delete(product); dismiss() } catch { self.error = "That could not be removed. Try again." }
                    }
                }
            }
            .onAppear {
                guard let product else { return }
                name = product.name; category = product.category; unit = product.unit
                price = partnerCount(product.price); mrp = product.mrp > 0 ? partnerCount(product.mrp) : ""
                stock = partnerCount(product.stock); lowAt = partnerCount(product.lowStockAt); active = product.active
            }
        }
    }

    private func save() async {
        let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanName.isEmpty, cleanName.count <= 120 else { error = "Give the item a name."; return }
        guard let priceValue = Double(price.replacingOccurrences(of: ",", with: "")), priceValue >= 0, priceValue <= 10_000_000 else {
            error = "Enter the selling price."; return
        }
        guard let stockValue = Double(stock.replacingOccurrences(of: ",", with: "")), stockValue >= 0, stockValue <= 1_000_000 else {
            error = "Enter how many you have (0 if none)."; return
        }
        let mrpValue = mrp.isEmpty ? 0 : (Double(mrp.replacingOccurrences(of: ",", with: "")) ?? -1)
        guard mrpValue >= 0, mrpValue <= 10_000_000, mrpValue == 0 || mrpValue >= priceValue else {
            error = "The MRP can't be lower than the selling price."; return
        }
        let lowValue = lowAt.isEmpty ? 5 : (Double(lowAt) ?? -1)
        guard lowValue >= 0, lowValue <= 100_000 else { error = "Enter a number from 0 up for the warning."; return }

        busy = true
        error = nil
        do {
            try await store.save(
                id: product?.id, name: cleanName,
                category: String(category.trimmingCharacters(in: .whitespacesAndNewlines).prefix(60)),
                unit: String(unit.trimmingCharacters(in: .whitespacesAndNewlines).prefix(30)),
                price: priceValue, mrp: mrpValue, stock: stockValue, lowStockAt: lowValue, active: active
            )
            dismiss()
        } catch {
            self.error = "That could not be saved. Check your connection and try again."
            busy = false
        }
    }
}

private struct PartnerShopTab: View {
    @ObservedObject var store: PartnerStore
    @State private var displayName = ""
    @State private var tagline = ""
    @State private var phone = ""
    @State private var address = ""
    @State private var hours = ""
    @State private var isOpen = true
    @State private var status: String?
    @State private var busy = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Toggle(isOn: $isOpen) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(isOpen ? "Open for customers" : "Closed right now").font(.system(size: 16, weight: .bold))
                            Text("Press Save to apply.").font(.system(size: 12)).foregroundColor(.secondary)
                        }
                    }
                }
                Section("Shop details") {
                    TextField("Shop name", text: $displayName)
                    TextField("Tagline", text: $tagline)
                    TextField("Phone", text: $phone).keyboardType(.phonePad)
                    TextField("Opening hours", text: $hours)
                    TextField("Address", text: $address)
                }
                Section("Delivery area") {
                    Text("Up to \(partnerCount(store.maxDeliveryKm)) km from your shop. DASHit sets this with you; contact DASHit to change it.")
                        .font(.system(size: 14)).foregroundColor(.secondary)
                }
                Section {
                    Button(busy ? "Saving…" : "Save changes") { Task { await save() } }.disabled(busy)
                    if let status { Text(status).font(.system(size: 13, weight: .semibold)).foregroundColor(.secondary) }
                }
            }
            .navigationTitle("My shop")
            .onChange(of: store.shop.count) { _, _ in load() }
            .onAppear { load() }
        }
    }

    private func load() {
        displayName = store.shop["displayName"] as? String ?? store.partnerName
        tagline = store.shop["tagline"] as? String ?? ""
        phone = store.shop["phone"] as? String ?? ""
        address = store.shop["address"] as? String ?? ""
        hours = store.shop["hours"] as? String ?? ""
        isOpen = (store.shop["isOpen"] as? Bool) ?? true
    }

    private func save() async {
        busy = true
        status = nil
        do {
            try await store.saveShop(
                displayName: String(displayName.prefix(80)), tagline: String(tagline.prefix(120)), phone: String(phone.prefix(20)),
                address: String(address.prefix(200)), hours: String(hours.prefix(80)), isOpen: isOpen
            )
            status = "Saved."
        } catch {
            status = "That could not be saved. Check your connection and try again."
        }
        busy = false
    }
}

private struct PartnerAccountTab: View {
    @ObservedObject var store: PartnerStore
    let email: String
    let onSignOut: () -> Void
    @State private var current = ""
    @State private var newPassword = ""
    @State private var again = ""
    @State private var status: String?
    @State private var busy = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Signed in as") {
                    Text(email)
                    if !store.partnerName.isEmpty { Text(store.partnerName).foregroundColor(.secondary) }
                }
                Section("Change password") {
                    SecureField("Current password", text: $current)
                    SecureField("New password (8+ characters)", text: $newPassword)
                    SecureField("New password again", text: $again)
                    Button(busy ? "Changing…" : "Change password") { Task { await change() } }
                        .disabled(busy || current.isEmpty || newPassword.isEmpty)
                    if let status { Text(status).font(.system(size: 13, weight: .semibold)).foregroundColor(.secondary) }
                }
                Section {
                    Button("Sign out", role: .destructive) { onSignOut() }
                }
                Section("Need help?") {
                    Text("If you can't sign in, or want your delivery area changed, contact DASHit.")
                        .font(.system(size: 14)).foregroundColor(.secondary)
                }
            }
            .navigationTitle("Account")
        }
    }

    private func change() async {
        guard newPassword.count >= 8 else { status = "Use at least 8 characters."; return }
        guard newPassword == again else { status = "The two new passwords don't match."; return }
        guard let user = Auth.auth().currentUser, let mail = user.email else { status = "Please sign in again."; return }
        busy = true
        status = nil
        do {
            try await user.reauthenticate(with: EmailAuthProvider.credential(withEmail: mail, password: current))
            try await user.updatePassword(to: newPassword)
            current = ""; newPassword = ""; again = ""
            status = "Password changed."
        } catch {
            status = "That is not your current password, or it could not be changed. Try again."
        }
        busy = false
    }
}
