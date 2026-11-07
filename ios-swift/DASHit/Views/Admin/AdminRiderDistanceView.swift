import SwiftUI
import CoreLocation
import FirebaseFirestore

/// How far each rider has ridden for deliveries and the petrol it took, from
/// every delivered order since the shop opened. The same rules as the website
/// console (`src/lib/riderDistance.js`):
///
/// - Riders' phones never saved their route, so the distance comes from the
///   orders: a trip is the store, each door in the order it was delivered, and
///   back. Orders a rider took out within 10 minutes of each other are one trip.
/// - Store to a door is the order's `distanceKm` (or the straight line to its
///   pin); door to door the straight line between the pins; every leg × 1.25
///   for the streets (`NightCharge.roadFactor`).
/// - Petrol: km ÷ mileage × petrol price, from Shop settings.
/// - Only delivered orders with a rider; a day is an India calendar day.
enum RiderDistance {
    static let tripGap: TimeInterval = 10 * 60

    struct Trip {
        let driverId: String
        let driverName: String
        let deliveries: Int
        let km: Double
        let start: Date?
        let dayKey: String?
        let unknown: Int
    }

    struct Day: Identifiable {
        let key: String
        var deliveries = 0
        var trips = 0
        var km: Double = 0
        var id: String { key }
    }

    struct Rider: Identifiable {
        let id: String
        var name: String
        var trips = 0
        var deliveries = 0
        var km: Double = 0
        var unknown = 0
        var days: [Day] = []
    }

    private struct Stop {
        let data: [String: Any]
        let left: Date?
        let done: Date?
        var start: Date { left ?? done ?? .distantPast }
    }

    // MARK: Reading an order

    static func date(_ value: Any?) -> Date? {
        switch value {
        case let ts as Timestamp: return ts.dateValue()
        case let d as Date: return d
        case let n as NSNumber:
            let v = n.doubleValue
            return Date(timeIntervalSince1970: v < 1e12 ? v : v / 1000)
        case let s as String:
            let withFraction = ISO8601DateFormatter()
            withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            return withFraction.date(from: s) ?? ISO8601DateFormatter().date(from: s)
        default: return nil
        }
    }

    private static func historyDate(_ data: [String: Any], _ match: (String) -> Bool) -> Date? {
        let list = (data["statusHistory"] as? [[String: Any]]) ?? []
        return list
            .filter { match(((($0["status"] as? String) ?? "")).lowercased()) }
            .compactMap { date($0["at"]) }
            .min()
    }

    static func leftStore(_ data: [String: Any]) -> Date? {
        historyDate(data) { $0.contains("out for delivery") || $0.contains("on the way") } ?? date(data["outForDeliveryAt"])
    }

    static func delivered(_ data: [String: Any]) -> Date? {
        date(data["deliveredAt"]) ?? historyDate(data) { $0 == "delivered" } ?? date(data["updatedAt"]) ?? date(data["createdAt"])
    }

    private static func pin(_ data: [String: Any]) -> CLLocationCoordinate2D? {
        let loc = (data["location"] as? [String: Any]) ?? (data["userAddress"] as? [String: Any]) ?? (data["deliveryAddress"] as? [String: Any])
        guard let loc else { return nil }
        func num(_ v: Any?) -> Double? {
            if let n = v as? NSNumber { return n.doubleValue }
            if let s = v as? String { return Double(s) }
            return nil
        }
        guard let lat = num(loc["lat"]) ?? num(loc["latitude"]), let lng = num(loc["lng"]) ?? num(loc["longitude"]),
              lat != 0 || lng != 0 else { return nil }
        return CLLocationCoordinate2D(latitude: lat, longitude: lng)
    }

    private static func straightKm(_ a: CLLocationCoordinate2D, _ b: CLLocationCoordinate2D) -> Double {
        CLLocation(latitude: a.latitude, longitude: a.longitude)
            .distance(from: CLLocation(latitude: b.latitude, longitude: b.longitude)) / 1000
    }

    private static func storeLegKm(_ data: [String: Any], hub: CLLocationCoordinate2D) -> Double? {
        if let saved = (data["distanceKm"] as? NSNumber)?.doubleValue, saved > 0 { return saved }
        if let text = data["distanceKm"] as? String, let saved = Double(text), saved > 0 { return saved }
        return pin(data).map { straightKm(hub, $0) }
    }

    // MARK: Trips

    static func trips(orders: [[String: Any]], hub: CLLocationCoordinate2D) -> [Trip] {
        var byRider: [String: [Stop]] = [:]
        var seen = Set<String>()
        for data in orders {
            let status = ((data["status"] as? String) ?? "").lowercased()
            let rider = ((data["driverId"] as? String) ?? "").trimmingCharacters(in: .whitespaces)
            let id = (data["id"] as? String) ?? (data["orderId"] as? String) ?? ""
            guard status == "delivered", !rider.isEmpty, id.isEmpty || seen.insert(id).inserted else { continue }
            byRider[rider, default: []].append(Stop(data: data, left: leftStore(data), done: delivered(data)))
        }

        var trips: [Trip] = []
        for (rider, stops) in byRider {
            var group: [Stop] = []
            var firstLeft: Date?
            for stop in stops.sorted(by: { $0.start < $1.start }) {
                let together = !group.isEmpty && stop.left != nil && firstLeft != nil
                    && stop.left!.timeIntervalSince(firstLeft!) <= tripGap
                if !together {
                    if !group.isEmpty { trips.append(trip(rider, group, hub: hub)) }
                    group = []
                    firstLeft = stop.left
                }
                group.append(stop)
            }
            if !group.isEmpty { trips.append(trip(rider, group, hub: hub)) }
        }
        return trips
    }

    private static func trip(_ rider: String, _ group: [Stop], hub: CLLocationCoordinate2D) -> Trip {
        let stops = group.sorted { ($0.done ?? $0.start) < ($1.done ?? $1.start) }
        let known = stops.filter { storeLegKm($0.data, hub: hub) != nil }
        var straight = 0.0
        if let first = known.first, let last = known.last {
            straight += storeLegKm(first.data, hub: hub) ?? 0
            for i in known.indices.dropFirst() {
                if let a = pin(known[i - 1].data), let b = pin(known[i].data) {
                    straight += straightKm(a, b)
                } else {
                    // Without both pins, as if back through the store.
                    straight += (storeLegKm(known[i - 1].data, hub: hub) ?? 0) + (storeLegKm(known[i].data, hub: hub) ?? 0)
                }
            }
            straight += storeLegKm(last.data, hub: hub) ?? 0
        }
        let start = stops.first.flatMap { $0.left ?? $0.done }
        return Trip(
            driverId: rider,
            driverName: stops.compactMap { ($0.data["driverName"] as? String)?.trimmingCharacters(in: .whitespaces) }.first { !$0.isEmpty } ?? "",
            deliveries: stops.count,
            km: straight * NightCharge.roadFactor,
            start: start,
            dayKey: start.map(dayKey),
            unknown: stops.count - known.count
        )
    }

    // MARK: Days and riders

    private static let india: Calendar = {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "Asia/Kolkata") ?? .current
        return cal
    }()

    private static let keyFormatter: DateFormatter = {
        let f = DateFormatter()
        f.calendar = india
        f.timeZone = india.timeZone
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    static func dayKey(_ date: Date) -> String { keyFormatter.string(from: date) }

    static func dayLabel(_ key: String) -> String {
        guard let date = keyFormatter.date(from: key) else { return "Date not known" }
        let f = DateFormatter()
        f.timeZone = india.timeZone
        f.locale = Locale(identifier: "en_IN")
        f.dateFormat = "EEE, d MMM"
        return f.string(from: date)
    }

    enum Period: String, CaseIterable, Identifiable {
        case today = "Today"
        case week = "7 days"
        case month = "This month"
        case all = "All time"
        var id: String { rawValue }

        /// The first and last day keys, both included; nil for all time.
        func keys(now: Date = Date()) -> (from: String, to: String)? {
            let today = RiderDistance.dayKey(now)
            switch self {
            case .today: return (today, today)
            case .week: return (RiderDistance.dayKey(now.addingTimeInterval(-6 * 86_400)), today)
            case .month: return (String(today.prefix(7)) + "-01", today)
            case .all: return nil
            }
        }
    }

    static func riders(_ trips: [Trip], period: Period, names: [String: String]) -> [Rider] {
        let range = period.keys()
        var riders: [String: Rider] = [:]
        var days: [String: [String: Day]] = [:]
        for trip in trips {
            if let range {
                guard let key = trip.dayKey, key >= range.from, key <= range.to else { continue }
            }
            var rider = riders[trip.driverId] ?? Rider(id: trip.driverId, name: names[trip.driverId].flatMap { $0.isEmpty ? nil : $0 } ?? (trip.driverName.isEmpty ? "Rider" : trip.driverName))
            rider.trips += 1
            rider.deliveries += trip.deliveries
            rider.km += trip.km
            rider.unknown += trip.unknown
            riders[trip.driverId] = rider
            let key = trip.dayKey ?? "unknown"
            var day = days[trip.driverId, default: [:]][key] ?? Day(key: key)
            day.trips += 1
            day.deliveries += trip.deliveries
            day.km += trip.km
            days[trip.driverId, default: [:]][key] = day
        }
        return riders.values
            .map { rider in
                var r = rider
                r.days = (days[rider.id] ?? [:]).values.sorted { $0.key > $1.key }
                return r
            }
            .sorted { $0.km > $1.km }
    }

    static func litres(_ km: Double, mileage: Double) -> Double { mileage > 0 ? km / mileage : 0 }
}

/// Every order, read once when the screen opens (and on pull to refresh), as the analytics screen does.
@MainActor
final class AdminRiderDistanceModel: ObservableObject {
    @Published private(set) var trips: [RiderDistance.Trip] = []
    @Published private(set) var isLoading = false
    @Published private(set) var hasLoaded = false
    @Published private(set) var errorText: String?

    func load(hub: CLLocationCoordinate2D) async {
        guard !isLoading else { return }
        isLoading = true
        errorText = nil
        defer { isLoading = false }
        do {
            let snapshot = try await Firestore.firestore().collection("orders").getDocuments()
            let orders: [[String: Any]] = snapshot.documents.map { doc in
                var data = doc.data()
                data["id"] = (data["id"] as? String) ?? doc.documentID
                return data
            }
            trips = RiderDistance.trips(orders: orders, hub: hub)
            hasLoaded = true
        } catch {
            errorText = "Couldn't read the orders. Pull down to try again."
        }
    }
}

struct AdminRiderDistanceView: View {
    @ObservedObject var vm: AdminDashboardViewModel
    @StateObject private var model = AdminRiderDistanceModel()
    @State private var period: RiderDistance.Period = .week

    private var names: [String: String] {
        Dictionary(vm.drivers.map { ($0.id, $0.name) }, uniquingKeysWith: { first, _ in first })
    }
    private var riders: [RiderDistance.Rider] { RiderDistance.riders(model.trips, period: period, names: names) }
    private var petrolPrice: Double { vm.nightCharge.petrolPrice }
    private var mileage: Double { vm.nightCharge.mileage }

    var body: some View {
        let list = riders
        let km = list.reduce(0) { $0 + $1.km }
        let litres = RiderDistance.litres(km, mileage: mileage)
        let deliveries = list.reduce(0) { $0 + $1.deliveries }
        let trips = list.reduce(0) { $0 + $1.trips }
        let unknown = list.reduce(0) { $0 + $1.unknown }

        List {
            Section {
                Picker("Period", selection: $period) {
                    ForEach(RiderDistance.Period.allCases) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())
            }

            Section {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    tile("Km ridden", Self.km(km), "\(list.count) rider\(list.count == 1 ? "" : "s")", "road.lanes")
                    tile("Petrol", "\(Self.one(litres)) L", "\(Self.plain(mileage)) km a litre", "fuelpump.fill")
                    tile("Petrol cost", Self.rupees(litres * petrolPrice), "at ₹\(Self.plain(petrolPrice)) a litre", "indianrupeesign")
                    tile("Deliveries", "\(deliveries)", "\(trips) trip\(trips == 1 ? "" : "s")", "shippingbox.fill")
                }
                .padding(.vertical, 4)
            }

            Section {
                if let error = model.errorText {
                    Text(error).foregroundColor(.red)
                } else if !model.hasLoaded && model.isLoading {
                    HStack(spacing: 10) {
                        ProgressView()
                        Text("Reading the orders…").foregroundColor(.secondary)
                    }
                } else if list.isEmpty {
                    Text("No deliveries by a rider in this period.").foregroundColor(.secondary)
                }
                ForEach(list) { rider in
                    NavigationLink {
                        days(of: rider)
                    } label: {
                        riderRow(rider)
                    }
                }
            } header: {
                Text("Riders")
            } footer: {
                Text(note(unknown: unknown))
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Distance & petrol")
        .task {
            if !model.hasLoaded { await model.load(hub: DeliveryEta.hub) }
        }
        .refreshable { await model.load(hub: DeliveryEta.hub) }
    }

    private func riderRow(_ rider: RiderDistance.Rider) -> some View {
        let litres = RiderDistance.litres(rider.km, mileage: mileage)
        return HStack(spacing: 12) {
            Text(String(rider.name.prefix(1)).uppercased())
                .font(.system(size: 15, weight: .heavy))
                .foregroundColor(.orange)
                .frame(width: 36, height: 36)
                .background(Color.orange.opacity(0.13), in: Circle())
            VStack(alignment: .leading, spacing: 2) {
                Text(rider.name).font(.system(size: 16, weight: .semibold))
                Text("\(rider.deliveries) deliver\(rider.deliveries == 1 ? "y" : "ies") · \(rider.trips) trip\(rider.trips == 1 ? "" : "s")")
                    .font(.system(size: 13))
                    .foregroundColor(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text(Self.km(rider.km)).font(.system(size: 16, weight: .bold)).monospacedDigit()
                Text("\(Self.rupees(litres * petrolPrice)) · \(Self.one(litres)) L")
                    .font(.system(size: 13))
                    .foregroundColor(.secondary)
                    .monospacedDigit()
            }
        }
        .accessibilityElement(children: .combine)
    }

    private func days(of rider: RiderDistance.Rider) -> some View {
        List {
            ForEach(rider.days) { day in
                let litres = RiderDistance.litres(day.km, mileage: mileage)
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(day.key == "unknown" ? "Date not known" : RiderDistance.dayLabel(day.key))
                            .font(.system(size: 16, weight: .semibold))
                        Text("\(day.deliveries) deliver\(day.deliveries == 1 ? "y" : "ies") · \(day.trips) trip\(day.trips == 1 ? "" : "s")")
                            .font(.system(size: 13))
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(Self.km(day.km)).font(.system(size: 16, weight: .bold)).monospacedDigit()
                        Text("\(Self.rupees(litres * petrolPrice)) · \(Self.one(litres)) L")
                            .font(.system(size: 13))
                            .foregroundColor(.secondary)
                            .monospacedDigit()
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle(rider.name)
    }

    private func tile(_ title: String, _ value: String, _ note: String, _ symbol: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Label(title.uppercased(), systemImage: symbol)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(.secondary)
            Text(value)
                .font(.system(size: 22, weight: .heavy))
                .monospacedDigit()
                .minimumScaleFactor(0.7)
                .lineLimit(1)
            Text(note)
                .font(.system(size: 12))
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func note(unknown: Int) -> String {
        var text = "Worked out from delivered orders, since the riders' phones never saved their route: each trip is the store, every door in the order it was delivered, and back, along the roads (the straight line × 1.25). Orders a rider took out within 10 minutes of each other count as one trip. Petrol uses the price and mileage in Shop settings (₹\(Self.plain(petrolPrice)) a litre, \(Self.plain(mileage)) km a litre), so changing them changes past figures too."
        if unknown > 0 {
            text += " \(unknown) deliver\(unknown == 1 ? "y has" : "ies have") no distance or address pin and add no km."
        }
        return text
    }

    private static func km(_ value: Double) -> String { "\(one(value)) km" }
    private static func one(_ value: Double) -> String {
        let rounded = (value * 10).rounded() / 10
        return rounded == rounded.rounded() ? String(Int(rounded)) : String(format: "%.1f", rounded)
    }
    private static func plain(_ value: Double) -> String {
        value == value.rounded() ? String(Int(value)) : String(value)
    }
    private static func rupees(_ value: Double) -> String { "₹\(Int(value.rounded()))" }
}
