import SwiftUI
import FirebaseAuth

/// "Restock requests": the out-of-stock items shoppers tapped "Notify me" on
/// (website and both apps), most wanted first, so the owner knows what to buy
/// (public/api/restock/list.php). "Restock" adds stock right on the row (no
/// trip to Stock) and puts the item back on sale; "Tell them it's back" then
/// sends everyone who asked one "Back in stock" notification. "Remove" closes
/// the requests without one. Same as the web console's
/// RestockRequestsView.jsx.
struct AdminRestockView: View {
    @State private var items: [Wanted]?
    @State private var total = 0
    @State private var isLoading = false
    @State private var error: String?
    @State private var note: String?
    @State private var pending: Pending?
    @State private var isWorking = false
    /// How many to add, per item, typed on its row.
    @State private var amounts: [String: Int] = [:]
    @State private var restockingId: String?

    private static let endpoint = URL(string: "https://dashit.co.in/api/restock/list.php")!

    struct Wanted: Decodable, Identifiable, Hashable {
        var id: String { productId }
        let productId: String
        let name: String
        let img: String?
        let unit: String?
        let count: Int
        let firstAt: Double?
        let lastAt: Double?
        var inStock: Bool?
        var stock: Int?
    }

    struct Pending: Identifiable {
        var id: String { item.productId + action }
        let item: Wanted
        let action: String // "notify" or "dismiss"
    }

    private struct Reply: Decodable {
        let items: [Wanted]?
        let total: Int?
        let sent: Int?
        let stock: Int?
        let error: String?
    }

    var body: some View {
        List {
            Section {
                HStack(spacing: 14) {
                    Image(systemName: "bell.badge.fill")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundColor(AdminStyle.brand)
                        .frame(width: 44, height: 44)
                        .background(AdminStyle.brand.opacity(0.12), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    VStack(alignment: .leading, spacing: 2) {
                        if let items {
                            Text(items.isEmpty ? "Nothing wanted" : "\(items.count) item\(items.count == 1 ? "" : "s") wanted")
                                .font(.system(size: 22, weight: .bold))
                            Text(items.isEmpty ? "Nobody is waiting for an item right now" : "\(total) request\(total == 1 ? "" : "s") from shoppers")
                                .font(.system(size: 14))
                                .foregroundColor(.secondary)
                        } else {
                            Text(isLoading ? "Checking…" : "Couldn't check")
                                .font(.system(size: 17, weight: .semibold))
                        }
                    }
                    Spacer()
                    if isLoading { ProgressView() }
                }
                .padding(.vertical, 4)
            } footer: {
                Text("Shoppers tap \"Notify me\" on an item that's out of stock. Restock the most wanted first, then tell them it's back.")
            }

            if let note {
                Section { Label(note, systemImage: "checkmark.circle.fill").foregroundColor(.green) }
            }
            if let error, pending == nil {
                Section { Text(error).foregroundColor(.red) }
            }

            if let items, !items.isEmpty {
                Section("Most wanted first") {
                    ForEach(items) { item in row(item) }
                }
            }
        }
        .listStyle(.insetGrouped)
        .refreshable { await load() }
        .task { if items == nil { await load() } }
        .confirmationDialog(
            pending.map { title($0) } ?? "",
            isPresented: Binding(get: { pending != nil }, set: { if !$0 { pending = nil } }),
            titleVisibility: .visible,
            presenting: pending
        ) { p in
            Button(p.action == "notify" ? "Send now" : "Remove", role: p.action == "notify" ? nil : .destructive) {
                Task { await run(p) }
            }
            Button("Not yet", role: .cancel) { pending = nil }
        } message: { p in
            Text(p.action == "notify"
                 ? "Each gets one \"Back in stock\" notification right away. The requests are then closed."
                 : "Nobody is told anything. Do this for an item the shop won't stock again.")
        }
    }

    private func title(_ p: Pending) -> String {
        p.action == "notify"
            ? "Tell \(p.item.count) \(p.item.count == 1 ? "person" : "people") \(p.item.name) is back?"
            : "Remove \(p.item.name) from the list?"
    }

    private func row(_ item: Wanted) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 12) {
                AsyncImage(url: URL(string: item.img ?? "").map(ProductPhotoStore.displayURL)) { phase in
                    if let image = phase.image {
                        image.resizable().scaledToFit()
                    } else {
                        Color(uiColor: .tertiarySystemFill)
                    }
                }
                .frame(width: 48, height: 48)
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))

                VStack(alignment: .leading, spacing: 3) {
                    Text(item.name)
                        .font(.system(size: 15, weight: .semibold))
                        .lineLimit(2)
                    Text([item.unit ?? "", item.lastAt.map { "last asked \(ago($0))" } ?? ""]
                        .filter { !$0.isEmpty }
                        .joined(separator: " · "))
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                    HStack(spacing: 6) {
                        tag("\(item.count) \(item.count == 1 ? "person wants" : "people want") it", color: AdminStyle.brand)
                        if item.inStock == true {
                            tag("In stock\(item.stock.map { " (\($0))" } ?? "")", color: .green)
                        } else {
                            tag("Still out of stock", color: .red)
                        }
                    }
                }
            }
            restockBar(item)
            HStack(spacing: 10) {
                if item.inStock == true {
                    Button {
                        pending = Pending(item: item, action: "notify")
                    } label: {
                        Label("Tell them it's back", systemImage: "paperplane.fill")
                            .font(.system(size: 14, weight: .bold))
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(AdminStyle.brand)
                } else {
                    Text("Restock it above, then tell them.")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                Button(role: .destructive) {
                    pending = Pending(item: item, action: "dismiss")
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .bold))
                }
                .buttonStyle(.bordered)
                .accessibilityLabel("Remove \(item.name) from the list")
            }
            .disabled(isWorking)
        }
        .padding(.vertical, 4)
    }

    /// − [qty] + and "Restock": adds stock without leaving the list.
    private func restockBar(_ item: Wanted) -> some View {
        let amount = amounts[item.productId] ?? 0
        let isSaving = restockingId == item.productId
        return HStack(spacing: 10) {
            HStack(spacing: 0) {
                Button {
                    amounts[item.productId] = max(0, amount - 1)
                } label: {
                    Image(systemName: "minus").frame(width: 36, height: 36)
                }
                .accessibilityLabel("One less")
                TextField("Qty", value: Binding(
                    get: { amounts[item.productId] == nil || amount == 0 ? nil : amount },
                    set: { amounts[item.productId] = min(10_000, max(0, $0 ?? 0)) }
                ), format: .number)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.center)
                .font(.system(size: 16, weight: .bold))
                .monospacedDigit()
                .frame(width: 54)
                .accessibilityLabel("How many \(item.name) to add")
                Button {
                    amounts[item.productId] = min(10_000, amount + 1)
                } label: {
                    Image(systemName: "plus").frame(width: 36, height: 36)
                }
                .accessibilityLabel("One more")
            }
            .font(.system(size: 14, weight: .bold))
            .buttonStyle(.borderless)
            .tint(.primary)
            .background(Color(uiColor: .tertiarySystemFill), in: RoundedRectangle(cornerRadius: 10, style: .continuous))

            Button {
                Task { await restock(item) }
            } label: {
                Group {
                    if isSaving {
                        ProgressView()
                    } else {
                        Label("Restock", systemImage: "shippingbox.and.arrow.backward.fill")
                    }
                }
                .font(.system(size: 14, weight: .bold))
                .frame(maxWidth: .infinity, minHeight: 22)
            }
            .buttonStyle(.borderedProminent)
            .tint(.green)
            .disabled(amount < 1 || isSaving || isWorking)
        }
    }

    private func restock(_ item: Wanted) async {
        let quantity = amounts[item.productId] ?? 0
        guard quantity > 0 else { return }
        restockingId = item.productId
        defer { restockingId = nil }
        do {
            let reply = try await call("restock", productId: item.productId, quantity: quantity)
            if let index = items?.firstIndex(where: { $0.productId == item.productId }) {
                items?[index].inStock = true
                items?[index].stock = reply.stock
            }
            amounts[item.productId] = nil
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            note = "\(item.name): \(reply.stock ?? quantity) in stock now"
            error = nil
        } catch {
            note = nil
            self.error = error.localizedDescription
        }
    }

    private func tag(_ text: String, color: Color) -> some View {
        Text(text)
            .font(.system(size: 11, weight: .bold))
            .foregroundColor(color)
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background(color.opacity(0.12), in: Capsule())
    }

    private func ago(_ seconds: Double) -> String {
        let minutes = max(1, Int((Date().timeIntervalSince1970 - seconds) / 60))
        if minutes < 60 { return "\(minutes) min ago" }
        let hours = minutes / 60
        if hours < 24 { return "\(hours) h ago" }
        let days = hours / 24
        return days == 1 ? "yesterday" : "\(days) days ago"
    }

    // MARK: - Server

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let reply = try await call("list")
            items = reply.items ?? []
            total = reply.total ?? 0
            error = nil
        } catch {
            self.error = error.localizedDescription
            if items == nil { items = [] }
        }
    }

    private func run(_ p: Pending) async {
        isWorking = true
        defer { isWorking = false }
        do {
            let reply = try await call(p.action, productId: p.item.productId)
            if p.action == "notify" {
                let n = reply.sent ?? 0
                note = n == 0 ? "Closed. None of them has notifications on." : "Told \(n) phone\(n == 1 ? "" : "s") \(p.item.name) is back"
            } else {
                note = "Removed \(p.item.name) from the list"
            }
            error = nil
            pending = nil
            await load()
        } catch {
            pending = nil
            note = nil
            self.error = error.localizedDescription
        }
    }

    private func call(_ action: String, productId: String? = nil, quantity: Int? = nil) async throws -> Reply {
        guard let user = Auth.auth().currentUser else {
            throw NSError(domain: "DASHit", code: 401, userInfo: [NSLocalizedDescriptionKey: "Please sign in again."])
        }
        let idToken = try await user.getIDToken()
        var body: [String: Any] = ["id_token": idToken, "action": action]
        if let productId { body["productId"] = productId }
        if let quantity { body["quantity"] = quantity }
        var request = URLRequest(url: Self.endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await URLSession.shared.data(for: request)
        let reply = (try? JSONDecoder().decode(Reply.self, from: data)) ?? Reply(items: nil, total: nil, sent: nil, stock: nil, error: nil)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            throw NSError(domain: "DASHit", code: status, userInfo: [NSLocalizedDescriptionKey: reply.error ?? "Something went wrong. Please try again."])
        }
        return reply
    }
}
