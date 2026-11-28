import SwiftUI

/// Every item sold in a period (delivered orders), not just the top ten:
/// pieces, money, how many orders it was in and when it last sold, with
/// search, sorting and a CSV file to share. Same list as the web console's
/// "Every item sold" (src/components/admin/SoldItemsCard.jsx). Opened from
/// "Sales & analytics" and as its own page, "Items sold".
struct AdminSoldItemsView: View {
    @ObservedObject var model: AdminAnalyticsModel
    @State private var range: AnalyticsRange
    @State private var query = ""
    @State private var sort: Sort = .units

    init(model: AdminAnalyticsModel, initialRange: AnalyticsRange = .month30) {
        self.model = model
        _range = State(initialValue: initialRange)
    }

    enum Sort: String, CaseIterable, Identifiable {
        case units = "Most sold"
        case revenue = "Most money"
        case recent = "Sold most recently"
        case orders = "In most orders"
        case name = "A to Z"
        var id: String { rawValue }
    }

    private var items: [AnalyticsProduct] { model.summary(for: range).soldItems }

    private var rows: [AnalyticsProduct] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        let list = q.isEmpty ? items : items.filter { "\($0.name) \($0.unit)".lowercased().contains(q) }
        switch sort {
        case .units: return list
        case .revenue: return list.sorted { $0.revenue > $1.revenue }
        case .recent: return list.sorted { $0.lastSold > $1.lastSold }
        case .orders: return list.sorted { $0.orders != $1.orders ? $0.orders > $1.orders : $0.units > $1.units }
        case .name: return list.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        }
    }

    var body: some View {
        let all = items
        let shown = rows
        List {
            Section {
                Picker("Period", selection: $range) {
                    ForEach(AnalyticsRange.allCases) { r in Text(r.label).tag(r) }
                }
                Picker("Sort by", selection: $sort) {
                    ForEach(Sort.allCases) { s in Text(s.rawValue).tag(s) }
                }
            } footer: {
                Text("\(all.count) different item\(all.count == 1 ? "" : "s") · \(all.reduce(0) { $0 + $1.units }) pieces · \(rupees(all.reduce(0) { $0 + $1.revenue })). Delivered orders only.")
            }

            if model.isLoading && model.orders.isEmpty {
                Section { ProgressView("Reading every order…").frame(maxWidth: .infinity) }
            } else if shown.isEmpty {
                Section {
                    Text(all.isEmpty ? "Nothing delivered in this period." : "No item matches that.")
                        .foregroundColor(.secondary)
                }
            } else {
                Section {
                    ForEach(shown) { item in row(item) }
                }
            }
        }
        .listStyle(.insetGrouped)
        .searchable(text: $query, prompt: "Find an item")
        .navigationTitle("Items sold")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                ShareLink(item: csvFile(shown)) {
                    Label("Share CSV", systemImage: "square.and.arrow.up")
                }
                .disabled(shown.isEmpty)
            }
        }
        .refreshable { await model.load() }
        .task { if model.orders.isEmpty { await model.load() } }
    }

    private func row(_ item: AnalyticsProduct) -> some View {
        HStack(spacing: 12) {
            AsyncImage(url: URL(string: item.img).map(ProductPhotoStore.displayURL)) { phase in
                if let image = phase.image {
                    image.resizable().scaledToFit()
                } else {
                    Color(uiColor: .tertiarySystemFill)
                }
            }
            .frame(width: 42, height: 42)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

            VStack(alignment: .leading, spacing: 2) {
                Text(item.name)
                    .font(.system(size: 15, weight: .semibold))
                    .lineLimit(2)
                Text([item.unit, "in \(item.orders) order\(item.orders == 1 ? "" : "s")", "last \(dayLabel(item.lastSold))"]
                    .filter { !$0.isEmpty }
                    .joined(separator: " · "))
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }
            Spacer(minLength: 8)
            VStack(alignment: .trailing, spacing: 2) {
                Text("\(item.units) pcs")
                    .font(.system(size: 15, weight: .bold))
                    .monospacedDigit()
                Text(rupees(item.revenue))
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.secondary)
                    .monospacedDigit()
            }
        }
        .padding(.vertical, 2)
        .accessibilityElement(children: .combine)
    }

    // MARK: - CSV

    private func csvFile(_ items: [AnalyticsProduct]) -> URL {
        func cell(_ value: String) -> String {
            value.contains(where: { $0 == "," || $0 == "\"" || $0 == "\n" })
                ? "\"\(value.replacingOccurrences(of: "\"", with: "\"\""))\""
                : value
        }
        let day = DateFormatter()
        day.timeZone = AnalyticsCalendar.zone
        day.dateFormat = "yyyy-MM-dd"
        var lines = ["Item,Pack,Pieces sold,Money (₹),Orders,Average price (₹),First sold,Last sold"]
        for p in items {
            lines.append([
                cell(p.name), cell(p.unit), "\(p.units)", "\(Int(p.revenue.rounded()))", "\(p.orders)",
                String(format: "%.2f", p.averagePrice), day.string(from: p.firstSold), day.string(from: p.lastSold),
            ].joined(separator: ","))
        }
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("dashit-items-sold-\(range.rawValue)-\(day.string(from: Date())).csv")
        try? lines.joined(separator: "\n").write(to: url, atomically: true, encoding: .utf8)
        return url
    }

    // MARK: - Formatting

    private func rupees(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.locale = Locale(identifier: "en_IN")
        formatter.maximumFractionDigits = 0
        return "₹" + (formatter.string(from: NSNumber(value: amount.rounded())) ?? "\(Int(amount.rounded()))")
    }

    private func dayLabel(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeZone = AnalyticsCalendar.zone
        formatter.locale = Locale(identifier: "en_IN")
        formatter.dateFormat = "d MMM"
        return formatter.string(from: date)
    }
}

/// "Items sold" as its own page in the side list: reads every order itself.
struct AdminSoldItemsPage: View {
    @StateObject private var model = AdminAnalyticsModel()

    var body: some View {
        AdminSoldItemsView(model: model)
    }
}
