import SwiftUI
import Charts

/// The admin's first page: what needs doing now, today's numbers, and charts
/// of the week. Laid out in columns on iPad and one column on iPhone.
struct AdminHomeView: View {
    @ObservedObject var vm: AdminDashboardViewModel
    var onOpenStoreSettings: () -> Void

    @Environment(\.horizontalSizeClass) private var sizeClass

    private var isWide: Bool { sizeClass == .regular }
    private var statColumns: [GridItem] {
        Array(repeating: GridItem(.flexible(), spacing: 14), count: isWide ? 4 : 2)
    }
    private var chartColumns: [GridItem] {
        Array(repeating: GridItem(.flexible(), spacing: 16, alignment: .top), count: isWide ? 2 : 1)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                greeting
                todoCard
                LazyVGrid(columns: statColumns, spacing: 14) {
                    StatCard(
                        title: "Sales today",
                        value: rupees(vm.todaySales),
                        note: change(vm.todaySales, from: vm.yesterdaySales, money: true),
                        symbol: "indianrupeesign.circle.fill"
                    )
                    StatCard(
                        title: "Orders today",
                        value: "\(vm.todayOrderCount)",
                        note: change(Double(vm.todayOrderCount), from: Double(vm.yesterdayOrderCount), money: false),
                        symbol: "bag.fill"
                    )
                    StatCard(
                        title: "Average order",
                        value: rupees(vm.todayAverageOrder),
                        note: vm.todayOrderCount == 0 ? "No orders yet today" : "Per order today",
                        symbol: "chart.bar.fill"
                    )
                    StatCard(
                        title: "Items sold today",
                        value: "\(vm.todayItemsSold)",
                        note: "Pieces, all orders",
                        symbol: "shippingbox.fill"
                    )
                }
                LazyVGrid(columns: chartColumns, spacing: 16) {
                    salesChart
                    hourChart
                    bestSellersChart
                    stockChart
                }
            }
            .padding(isWide ? 24 : 16)
            .padding(.bottom, 24)
            .frame(maxWidth: 1100, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .background(AdminStyle.page.ignoresSafeArea())
    }

    // MARK: - Top

    private var greeting: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(greetingText)
                    .font(.system(size: isWide ? 30 : 26, weight: .heavy))
                Text(Date().formatted(.dateTime.weekday(.wide).day().month(.wide)))
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(.secondary)
            }
            Spacer(minLength: 12)
            Button(action: onOpenStoreSettings) {
                HStack(spacing: 8) {
                    Circle()
                        .fill(vm.storeConfig.isOpen ? Color.green : Color.red)
                        .frame(width: 10, height: 10)
                    Text(vm.storeConfig.isOpen ? "Shop is open" : "Shop is closed")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(vm.storeConfig.isOpen ? .green : .red)
                }
                .padding(.horizontal, 16)
                .frame(height: 44)
                .background((vm.storeConfig.isOpen ? Color.green : Color.red).opacity(0.12), in: Capsule())
            }
            .buttonStyle(.plain)
            .accessibilityHint("Opens shop settings")
        }
    }

    private var greetingText: String {
        switch Calendar.current.component(.hour, from: Date()) {
        case 5..<12: return "Good morning"
        case 12..<17: return "Good afternoon"
        default: return "Good evening"
        }
    }

    /// The one card that says what to do next, with a big button for it.
    private var todoCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Do this now")
                .font(.system(size: 13, weight: .heavy))
                .tracking(0.8)
                .foregroundColor(.secondary)
                .textCase(.uppercase)

            if vm.ordersToPack == 0 && vm.runningOut.isEmpty && vm.storeConfig.isOpen {
                HStack(spacing: 12) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 28))
                        .foregroundColor(.green)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("All done for now")
                            .font(.system(size: 18, weight: .bold))
                        Text("New orders will ring and show up here.")
                            .font(.system(size: 14))
                            .foregroundColor(.secondary)
                    }
                }
            } else {
                VStack(spacing: 10) {
                    if !vm.storeConfig.isOpen {
                        TodoRow(
                            symbol: "moon.zzz.fill",
                            tint: .red,
                            title: "The shop is closed",
                            detail: "Customers can't order right now.",
                            button: "Open the shop",
                            action: onOpenStoreSettings
                        )
                    }
                    if vm.ordersToPack > 0 {
                        TodoRow(
                            symbol: "shippingbox.fill",
                            tint: AdminStyle.brand,
                            title: "\(vm.ordersToPack) order\(vm.ordersToPack == 1 ? "" : "s") to pack",
                            detail: "Pack them, then give them to a rider.",
                            button: "Go to orders",
                            action: { open(.orders) }
                        )
                    }
                    if !vm.runningOut.isEmpty {
                        TodoRow(
                            symbol: "exclamationmark.triangle.fill",
                            tint: .orange,
                            title: "\(vm.runningOut.count) item\(vm.runningOut.count == 1 ? " is" : "s are") running out",
                            detail: vm.runningOut.prefix(3).map(\.name).joined(separator: ", "),
                            button: "See stock",
                            action: { open(.inventory) }
                        )
                    }
                }
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .adminCard()
    }

    private func open(_ tab: AdminTab) {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        withAnimation(.easeOut(duration: 0.2)) { vm.selectedTab = tab }
    }

    // MARK: - Charts

    private var salesChart: some View {
        ChartCard(title: "Sales, last 7 days", subtitle: "₹ from all orders that weren't cancelled") {
            Chart(vm.salesByDay) { day in
                BarMark(
                    x: .value("Day", day.day, unit: .day),
                    y: .value("Sales", day.sales)
                )
                .foregroundStyle(day.isToday ? AdminStyle.brand : AdminStyle.brand.opacity(0.35))
                .cornerRadius(6)
                .annotation(position: .top, spacing: 4) {
                    if day.sales > 0 {
                        Text(shortRupees(day.sales))
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(.secondary)
                    }
                }
            }
            .chartXAxis {
                AxisMarks(values: .stride(by: .day)) { _ in
                    AxisValueLabel(format: .dateTime.weekday(.abbreviated), centered: true)
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading) { value in
                    AxisGridLine()
                    AxisValueLabel {
                        if let amount = value.as(Double.self) { Text(shortRupees(amount)) }
                    }
                }
            }
        }
    }

    private var hourChart: some View {
        ChartCard(title: "Orders by hour, today", subtitle: "When customers are ordering") {
            if vm.ordersByHourToday.allSatisfy({ $0.orders == 0 }) {
                EmptyChart(text: "No orders yet today")
            } else {
                Chart(vm.ordersByHourToday) { slot in
                    AreaMark(x: .value("Hour", slot.hour), y: .value("Orders", slot.orders))
                        .interpolationMethod(.monotone)
                        .foregroundStyle(AdminStyle.brand.opacity(0.18))
                    LineMark(x: .value("Hour", slot.hour), y: .value("Orders", slot.orders))
                        .interpolationMethod(.monotone)
                        .foregroundStyle(AdminStyle.brand)
                        .lineStyle(StrokeStyle(lineWidth: 2.5))
                    PointMark(x: .value("Hour", slot.hour), y: .value("Orders", slot.orders))
                        .foregroundStyle(AdminStyle.brand)
                        .symbolSize(slot.orders > 0 ? 30 : 0)
                }
                .chartXAxis {
                    AxisMarks(values: .automatic(desiredCount: 6)) { value in
                        AxisGridLine()
                        AxisValueLabel {
                            if let hour = value.as(Int.self) { Text(hourLabel(hour)) }
                        }
                    }
                }
                .chartYAxis {
                    AxisMarks(position: .leading, values: .automatic(desiredCount: 4))
                }
            }
        }
    }

    private var bestSellersChart: some View {
        ChartCard(title: "Best sellers this week", subtitle: "Pieces sold") {
            if vm.bestSellers.isEmpty {
                EmptyChart(text: "Nothing sold this week yet")
            } else {
                Chart(vm.bestSellers) { item in
                    BarMark(
                        x: .value("Pieces", item.units),
                        y: .value("Item", item.name)
                    )
                    .foregroundStyle(AdminStyle.brand)
                    .cornerRadius(5)
                    .annotation(position: .trailing, spacing: 6) {
                        Text("\(item.units)")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.secondary)
                    }
                }
                .chartXAxis(.hidden)
                .chartYAxis {
                    AxisMarks { value in
                        AxisValueLabel {
                            if let name = value.as(String.self) {
                                Text(name).lineLimit(1)
                            }
                        }
                    }
                }
            }
        }
    }

    private var stockChart: some View {
        ChartCard(title: "Stock by distributor", subtitle: "Pieces on the shelf, by who you bought them from") {
            if vm.stockByDistributor.isEmpty {
                EmptyChart(text: "No stock counted yet")
            } else {
                let total = vm.stockByDistributor.reduce(0) { $0 + $1.units }
                HStack(alignment: .center, spacing: 18) {
                    Chart(vm.stockByDistributor) { slice in
                        SectorMark(
                            angle: .value("Pieces", slice.units),
                            innerRadius: .ratio(0.62),
                            angularInset: 1.5
                        )
                        .cornerRadius(4)
                        .foregroundStyle(by: .value("Distributor", slice.name))
                    }
                    .chartForegroundStyleScale(domain: vm.stockByDistributor.map(\.name), range: AdminStyle.palette)
                    .chartLegend(.hidden)
                    .chartBackground { _ in
                        VStack(spacing: 0) {
                            Text("\(total)")
                                .font(.system(size: 20, weight: .heavy))
                            Text("pieces")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(.secondary)
                        }
                    }
                    .frame(width: 150, height: 150)

                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(Array(vm.stockByDistributor.enumerated()), id: \.element.id) { index, slice in
                            HStack(spacing: 8) {
                                Circle()
                                    .fill(AdminStyle.palette[index % AdminStyle.palette.count])
                                    .frame(width: 10, height: 10)
                                Text(slice.name)
                                    .font(.system(size: 13, weight: .semibold))
                                    .lineLimit(1)
                                Spacer(minLength: 4)
                                Text("\(slice.units)")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundColor(.secondary)
                                    .monospacedDigit()
                            }
                        }
                    }
                }
            }
        }
    }

    // MARK: - Formatting

    private func rupees(_ amount: Double) -> String {
        "₹" + (Int(exactly: amount.rounded()) ?? 0).formatted(.number.grouping(.automatic))
    }

    /// ₹850, ₹1.2k, ₹12k: short enough for a chart label.
    private func shortRupees(_ amount: Double) -> String {
        guard amount.isFinite else { return "₹0" }
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

    /// "↑ ₹420 more than yesterday", in plain words.
    private func change(_ today: Double, from yesterday: Double, money: Bool) -> String {
        let difference = today - yesterday
        if difference == 0 { return "Same as yesterday" }
        let amount = money ? rupees(abs(difference)) : "\(Int(abs(difference)))"
        return difference > 0 ? "↑ \(amount) more than yesterday" : "↓ \(amount) less than yesterday"
    }
}

// MARK: - Pieces

private struct StatCard: View {
    let title: String
    let value: String
    let note: String
    let symbol: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: symbol)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(AdminStyle.brand)
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }
            Text(value)
                .font(.system(size: 28, weight: .heavy))
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.6)
                .contentTransition(.numericText())
            Text(note)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.secondary)
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(16)
        .frame(maxWidth: .infinity, minHeight: 128, alignment: .topLeading)
        .adminCard()
        .accessibilityElement(children: .combine)
    }
}

private struct TodoRow: View {
    let symbol: String
    let tint: Color
    let title: String
    let detail: String
    let button: String
    let action: () -> Void

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: symbol)
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(tint)
                .frame(width: 44, height: 44)
                .background(tint.opacity(0.12), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 17, weight: .bold))
                Text(detail)
                    .font(.system(size: 13))
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
            Spacer(minLength: 8)
            Button(action: action) {
                Text(button)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .frame(minHeight: 44)
                    .background(AdminStyle.brand, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .buttonStyle(.plain)
        }
    }
}

private struct ChartCard<Content: View>: View {
    let title: String
    let subtitle: String
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 17, weight: .bold))
            Text(subtitle)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.secondary)
                .padding(.bottom, 10)
            content
                .frame(height: 200)
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .adminCard()
    }
}

private struct EmptyChart: View {
    let text: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "chart.bar.xaxis")
                .font(.system(size: 28))
                .foregroundColor(.secondary.opacity(0.6))
            Text(text)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Look

/// The web console's colours: its orange, slate page and white cards with a hairline.
enum AdminStyle {
    static let brand = Color(red: 1.0, green: 0.357, blue: 0.0)
    static let page = Color(uiColor: .systemGroupedBackground)
    static let card = Color(uiColor: .secondarySystemGroupedBackground)
    static let hairline = Color(uiColor: .separator).opacity(0.5)
    /// Chart slices: the brand orange first, then calm, easy-to-tell-apart colours.
    static let palette: [Color] = [
        brand,
        Color(red: 0.02, green: 0.09, blue: 0.22),
        Color(red: 0.13, green: 0.55, blue: 0.45),
        Color(red: 0.95, green: 0.70, blue: 0.20),
        Color(red: 0.35, green: 0.45, blue: 0.85),
        Color(uiColor: .systemGray3),
    ]
}

extension View {
    func adminCard(cornerRadius: CGFloat = 16) -> some View {
        self
            .background(AdminStyle.card, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .strokeBorder(AdminStyle.hairline, lineWidth: 1)
            )
    }
}
