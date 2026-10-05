import SwiftUI
import Charts
import FirebaseFirestore

/// Sales and orders by day for a chosen period, and the shop's lifetime
/// totals. Same rules as the web console (`src/lib/salesAnalytics.js`):
/// - a day is an India calendar day, whatever the phone's time zone;
/// - an order belongs to the day it was placed;
/// - sales are delivered orders; "booked" adds the ones still on their way;
/// - an order cancelled because it was replaced ("Replaced by …") is left out.
/// Every order is read once when the screen opens and on Refresh.
struct AdminAnalyticsView: View {
    @StateObject private var model = AdminAnalyticsModel()
    @State private var range: AnalyticsRange = .week
    @State private var showDelivered = false

    @Environment(\.horizontalSizeClass) private var sizeClass
    private var isWide: Bool { sizeClass == .regular }
    private var statColumns: [GridItem] {
        Array(repeating: GridItem(.flexible(), spacing: 14), count: isWide ? 3 : 2)
    }

    var body: some View {
        let summary = model.summary(for: range)
        let lifetime = model.summary(for: .lifetime)
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                rangePicker
                if let error = model.errorText {
                    Text(error)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.orange)
                }
                if model.isLoading && model.orders.isEmpty {
                    ProgressView("Reading every order…")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 30)
                }
                LazyVGrid(columns: statColumns, spacing: 14) {
                    tile("Sales", rupees(summary.sales), "\(summary.delivered) delivered", "indianrupeesign.circle.fill")
                    tile("Orders delivered", "\(summary.delivered)", "\(summary.placed) placed · \(summary.pending) on the way", "checkmark.seal.fill")
                    tile("Average order", rupees(summary.averageOrder), "\(summary.units) items sold", "chart.bar.fill")
                    tile("Cancelled", "\(summary.cancelled)", summary.cancelNote, "xmark.circle.fill")
                    tile("Booked", rupees(summary.booked), "Sales + orders on the way", "chart.line.uptrend.xyaxis")
                    tile("Customers", "\(summary.customers)", "\(summary.repeatCustomers) ordered more than once", "person.2.fill")
                }
                dailyChart(summary)
                bestSellers(summary)
                moneyCard(summary)
                lifetimeCard(lifetime)
                dayTable(summary)
            }
            .padding(isWide ? 24 : 16)
            .padding(.bottom, 24)
            .frame(maxWidth: 1100, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .background(AdminStyle.page.ignoresSafeArea())
        .refreshable { await model.load() }
        .task { if model.orders.isEmpty { await model.load() } }
    }

    // MARK: - Pieces

    private var rangePicker: some View {
        HStack(spacing: 10) {
            Picker("Period", selection: $range) {
                ForEach(AnalyticsRange.allCases) { r in Text(r.label).tag(r) }
            }
            .pickerStyle(.menu)
            .tint(AdminStyle.brand)
            Spacer()
            Button {
                Task { await model.load() }
            } label: {
                Label(model.isLoading ? "Loading…" : "Refresh", systemImage: "arrow.clockwise")
                    .font(.system(size: 14, weight: .bold))
            }
            .disabled(model.isLoading)
        }
        .padding(14)
        .adminCard()
    }

    private func tile(_ title: String, _ value: String, _ note: String, _ symbol: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Image(systemName: symbol)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(AdminStyle.brand)
                Text(title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }
            Text(value)
                .font(.system(size: 24, weight: .heavy))
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            Text(note)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.secondary)
                .lineLimit(2)
        }
        .padding(14)
        .frame(maxWidth: .infinity, minHeight: 112, alignment: .topLeading)
        .adminCard()
        .accessibilityElement(children: .combine)
    }

    private func dailyChart(_ summary: AnalyticsSummary) -> some View {
        let days = model.chartDays(for: range, summary: summary)
        return VStack(alignment: .leading, spacing: 4) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(showDelivered ? "Orders delivered each day" : "Daily sales")
                        .font(.system(size: 17, weight: .bold))
                    Text(range.isSingleDay ? "Last 7 days, for comparison · India time" : "Each day in the period · India time")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.secondary)
                }
                Spacer()
                Picker("Show", selection: $showDelivered) {
                    Text("₹").tag(false)
                    Text("Delivered").tag(true)
                }
                .pickerStyle(.segmented)
                .frame(width: 150)
            }
            .padding(.bottom, 8)
            if days.isEmpty {
                Text("No orders yet.")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, minHeight: 120)
            } else {
                Chart(days) { day in
                    BarMark(
                        x: .value("Day", day.date, unit: .day),
                        y: .value(showDelivered ? "Delivered" : "Sales", showDelivered ? Double(day.delivered) : day.sales)
                    )
                    .foregroundStyle(AdminStyle.brand)
                    .cornerRadius(4)
                }
                .chartYAxis {
                    AxisMarks(position: .leading) { value in
                        AxisGridLine()
                        AxisValueLabel {
                            if let amount = value.as(Double.self) {
                                Text(showDelivered ? "\(Int(amount))" : shortRupees(amount))
                            }
                        }
                    }
                }
                .frame(height: 200)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .adminCard()
    }

    private func bestSellers(_ summary: AnalyticsSummary) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Best sellers").font(.system(size: 17, weight: .bold))
            if summary.topProducts.isEmpty {
                Text("Nothing delivered in this period.")
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
            } else {
                let top = Double(summary.topProducts.first?.units ?? 1)
                ForEach(Array(summary.topProducts.enumerated()), id: \.element.name) { index, item in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text("\(index + 1). \(item.name)")
                                .font(.system(size: 14, weight: .semibold))
                                .lineLimit(1)
                            Spacer()
                            Text("\(item.units) pcs · \(rupees(item.revenue))")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.secondary)
                                .monospacedDigit()
                        }
                        GeometryReader { geo in
                            Capsule()
                                .fill(AdminStyle.brand)
                                .frame(width: max(4, geo.size.width * Double(item.units) / max(1, top)), height: 5)
                        }
                        .frame(height: 5)
                    }
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .adminCard()
    }

    private func moneyCard(_ summary: AnalyticsSummary) -> some View {
        let online = summary.sales > 0 ? Int((summary.onlineSales / summary.sales * 100).rounded()) : 0
        return VStack(alignment: .leading, spacing: 8) {
            Text("Where the money came from").font(.system(size: 17, weight: .bold))
            row("Paid online", "\(rupees(summary.onlineSales)) (\(online)%)")
            row("Cash on delivery", "\(rupees(summary.codSales)) (\(summary.sales > 0 ? 100 - online : 0)%)")
            row("Delivery charges collected", rupees(summary.deliveryFees))
            row("Discounts given", rupees(summary.discounts))
            if let busiest = summary.busiestHour {
                row("Busiest hour", hourLabel(busiest))
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .adminCard()
    }

    private func lifetimeCard(_ life: AnalyticsSummary) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: "trophy.fill").foregroundColor(AdminStyle.brand)
                Text("Lifetime").font(.system(size: 17, weight: .bold))
                if let first = life.firstDay {
                    Text("since \(dayLabel(first, year: true))")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.secondary)
                }
            }
            row("Total sales", rupees(life.sales))
            row("Orders delivered", "\(life.delivered)")
            row("Orders placed", "\(life.placed)")
            row("Items sold", "\(life.units)")
            row("Average order", rupees(life.averageOrder))
            row("Customers", "\(life.customers)")
            row("Days with orders", "\(life.days.count)")
            if let best = life.bestDay {
                row("Best day", "\(dayLabel(best.date, year: false)) · \(rupees(best.sales))")
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .adminCard()
    }

    private func dayTable(_ summary: AnalyticsSummary) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Day by day").font(.system(size: 17, weight: .bold))
            if summary.days.isEmpty {
                Text("No orders in this period.")
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
            } else {
                ForEach(summary.days.reversed()) { day in
                    HStack {
                        Text(dayLabel(day.date, year: true))
                            .font(.system(size: 14, weight: .semibold))
                        Spacer()
                        VStack(alignment: .trailing, spacing: 1) {
                            Text(rupees(day.sales))
                                .font(.system(size: 14, weight: .bold))
                                .monospacedDigit()
                            Text("\(day.delivered) delivered · \(day.placed) placed · \(day.cancelled) cancelled")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                    Divider()
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .adminCard()
    }

    private func row(_ title: String, _ value: String) -> some View {
        HStack {
            Text(title)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .font(.system(size: 14, weight: .bold))
                .monospacedDigit()
        }
    }

    // MARK: - Formatting

    private func rupees(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.locale = Locale(identifier: "en_IN")
        formatter.maximumFractionDigits = 0
        return "₹" + (formatter.string(from: NSNumber(value: amount.rounded())) ?? "\(Int(amount.rounded()))")
    }

    private func shortRupees(_ amount: Double) -> String {
        if amount >= 1000 {
            let thousands = amount / 1000
            return thousands >= 10 ? "₹\(Int(thousands.rounded()))k" : String(format: "₹%.1fk", thousands)
        }
        return "₹\(Int(amount.rounded()))"
    }

    private func hourLabel(_ hour: Int) -> String {
        switch hour {
        case 0: return "12am"
        case 12: return "12pm"
        case 13...23: return "\(hour - 12)pm"
        default: return "\(hour)am"
        }
    }

    private func dayLabel(_ date: Date, year: Bool) -> String {
        let formatter = DateFormatter()
        formatter.timeZone = AnalyticsCalendar.zone
        formatter.locale = Locale(identifier: "en_IN")
        formatter.dateFormat = year ? "d MMM yyyy" : "d MMM"
        return formatter.string(from: date)
    }
}

// MARK: - Numbers

enum AnalyticsRange: String, CaseIterable, Identifiable {
    case today, yesterday, week, month30, thisMonth, lifetime
    var id: String { rawValue }

    var label: String {
        switch self {
        case .today: return "Today"
        case .yesterday: return "Yesterday"
        case .week: return "Last 7 days"
        case .month30: return "Last 30 days"
        case .thisMonth: return "This month"
        case .lifetime: return "Lifetime"
        }
    }

    var isSingleDay: Bool { self == .today || self == .yesterday }

    /// First and last India day of the range (start-of-day dates), nil for no limit.
    func bounds(now: Date = Date()) -> (from: Date?, to: Date?) {
        let cal = AnalyticsCalendar.calendar
        let today = cal.startOfDay(for: now)
        func back(_ days: Int) -> Date { cal.date(byAdding: .day, value: -days, to: today) ?? today }
        switch self {
        case .today: return (today, today)
        case .yesterday: return (back(1), back(1))
        case .week: return (back(6), today)
        case .month30: return (back(29), today)
        case .thisMonth: return (cal.date(from: cal.dateComponents([.year, .month], from: today)) ?? today, today)
        case .lifetime: return (nil, nil)
        }
    }
}

enum AnalyticsCalendar {
    static let zone = TimeZone(identifier: "Asia/Kolkata") ?? TimeZone(secondsFromGMT: 19_800)!
    static let calendar: Calendar = {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = zone
        return cal
    }()
}

struct AnalyticsDay: Identifiable {
    var id: Date { date }
    let date: Date
    var placed = 0
    var delivered = 0
    var cancelled = 0
    var sales: Double = 0
}

struct AnalyticsProduct {
    let name: String
    var units: Int
    var revenue: Double
}

struct AnalyticsSummary {
    var placed = 0
    var delivered = 0
    var cancelled = 0
    var pending = 0
    var sales: Double = 0
    var booked: Double = 0
    var units = 0
    var deliveryFees: Double = 0
    var discounts: Double = 0
    var onlineSales: Double = 0
    var codSales: Double = 0
    var customers = 0
    var repeatCustomers = 0
    var days: [AnalyticsDay] = []
    var topProducts: [AnalyticsProduct] = []
    var busiestHour: Int?
    var firstDay: Date?

    var averageOrder: Double { delivered == 0 ? 0 : sales / Double(delivered) }
    var cancelNote: String {
        let finished = delivered + cancelled
        guard finished > 0 else { return "None" }
        return "\(Int((Double(cancelled) / Double(finished) * 100).rounded()))% of finished orders"
    }
    var bestDay: AnalyticsDay? {
        guard let best = days.max(by: { $0.sales < $1.sales }), best.sales > 0 else { return nil }
        return best
    }
}

@MainActor
final class AdminAnalyticsModel: ObservableObject {
    @Published private(set) var orders: [Order] = []
    @Published private(set) var isLoading = false
    @Published private(set) var errorText: String?

    private let db = Firestore.firestore()

    /// Every order, read once (one read per order on the free plan, so only on open and Refresh).
    func load() async {
        guard !isLoading else { return }
        isLoading = true
        errorText = nil
        defer { isLoading = false }
        do {
            let snapshot = try await db.collection("orders").getDocuments()
            let decoder = Firestore.Decoder()
            orders = snapshot.documents.compactMap { doc in
                var data = doc.data()
                data["id"] = (data["id"] as? String) ?? doc.documentID
                return try? decoder.decode(Order.self, from: data)
            }
        } catch {
            errorText = "Couldn't read the orders. Pull down to try again."
        }
    }

    private static func isReplaced(_ order: Order) -> Bool {
        order.status.stage == .cancelled
            && (order.rejectionReason ?? "").lowercased().hasPrefix("replaced by")
    }

    func summary(for range: AnalyticsRange) -> AnalyticsSummary {
        let cal = AnalyticsCalendar.calendar
        let bounds = range.bounds()
        var s = AnalyticsSummary()
        var days: [Date: AnalyticsDay] = [:]
        var products: [String: AnalyticsProduct] = [:]
        var customers: [String: Int] = [:]
        var hours = Array(repeating: 0, count: 24)

        for order in orders where !Self.isReplaced(order) && order.createdAt > 0 {
            let placedAt = Date(timeIntervalSince1970: order.createdAt)
            let day = cal.startOfDay(for: placedAt)
            if let from = bounds.from, day < from { continue }
            if let to = bounds.to, day > to { continue }

            var bucket = days[day] ?? AnalyticsDay(date: day)
            bucket.placed += 1
            s.placed += 1
            if s.firstDay == nil || day < s.firstDay! { s.firstDay = day }

            let stage = order.status.stage
            if stage == .cancelled {
                bucket.cancelled += 1
                s.cancelled += 1
                days[day] = bucket
                continue
            }
            s.booked += order.grandTotal
            hours[cal.component(.hour, from: placedAt)] += 1
            if !order.userId.isEmpty { customers[order.userId, default: 0] += 1 }

            if stage == .delivered {
                bucket.delivered += 1
                bucket.sales += order.grandTotal
                s.delivered += 1
                s.sales += order.grandTotal
                s.deliveryFees += order.deliveryFee
                s.discounts += order.discount
                if order.isPaidOnline { s.onlineSales += order.grandTotal } else { s.codSales += order.grandTotal }
                for item in order.items {
                    s.units += item.qty
                    var p = products[item.name] ?? AnalyticsProduct(name: item.name, units: 0, revenue: 0)
                    p.units += item.qty
                    p.revenue += item.price * Double(item.qty)
                    products[item.name] = p
                }
            } else {
                s.pending += 1
            }
            days[day] = bucket
        }

        s.days = days.values.sorted { $0.date < $1.date }
        s.customers = customers.count
        s.repeatCustomers = customers.values.filter { $0 > 1 }.count
        s.topProducts = Array(
            products.values
                .sorted { $0.units != $1.units ? $0.units > $1.units : $0.revenue > $1.revenue }
                .prefix(10)
        )
        if let peak = hours.max(), peak > 0 { s.busiestHour = hours.firstIndex(of: peak) }
        return s
    }

    /// The bars: every day of the range (the last 7 for a single day), empty days as zero.
    func chartDays(for range: AnalyticsRange, summary: AnalyticsSummary) -> [AnalyticsDay] {
        let cal = AnalyticsCalendar.calendar
        let today = cal.startOfDay(for: Date())
        let from: Date
        var to = today
        var source = summary.days
        switch range {
        case .today, .yesterday:
            source = self.summary(for: .week).days
            from = AnalyticsRange.week.bounds().from ?? today
            to = range.bounds().to ?? today
        case .lifetime:
            guard let first = summary.firstDay else { return [] }
            from = first
        default:
            from = range.bounds().from ?? today
        }
        let byDay = Dictionary(source.map { ($0.date, $0) }, uniquingKeysWith: { a, _ in a })
        var out: [AnalyticsDay] = []
        var day = from
        while day <= to && out.count < 730 {
            out.append(byDay[day] ?? AnalyticsDay(date: day))
            guard let next = cal.date(byAdding: .day, value: 1, to: day) else { break }
            day = next
        }
        return out
    }
}
