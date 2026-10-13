import Foundation
import CoreLocation
import FirebaseFirestore

/// Where a rider's phone last said it was: `drivers/{uid}/telemetry/live`,
/// which the rider app writes about every 20 seconds while it is open
/// (`pushDriverTelemetryToQueue` in `src/lib/db.js`). Staff may read it.
struct RiderPosition: Hashable {
    let latitude: Double
    let longitude: Double
    let heading: Double?
    let speed: Double?
    /// When the rider's phone sent it; nil if the record doesn't say.
    let updatedAt: Date?

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    /// The same position in the shape the rider's map marker draws.
    var tracking: DriverLiveTracking {
        DriverLiveTracking(lat: latitude, lng: longitude, heading: heading, speed: speed)
    }

    /// Sent in the last three minutes: the rider app is open and reporting.
    func isLive(at now: Date = Date()) -> Bool {
        guard let updatedAt else { return false }
        return now.timeIntervalSince(updatedAt) < 180
    }

    /// "Here now", "Seen 4 min ago", "Last seen 12 Oct, 6:40 pm".
    func seenLabel(at now: Date = Date()) -> String {
        guard let updatedAt else { return "Last place known" }
        let minutes = Int(now.timeIntervalSince(updatedAt) / 60)
        if minutes < 1 { return "Here now" }
        if minutes < 60 { return "Seen \(minutes) min ago" }
        if Calendar.current.isDate(updatedAt, inSameDayAs: now) {
            return "Last seen at \(updatedAt.formatted(date: .omitted, time: .shortened))"
        }
        return "Last seen \(updatedAt.formatted(.dateTime.day().month(.abbreviated).hour().minute()))"
    }

    /// From a `telemetry/live` document; nil if it holds no position.
    init?(data: [String: Any]) {
        guard let lat = (data["latitude"] as? NSNumber)?.doubleValue ?? (data["lat"] as? NSNumber)?.doubleValue,
              let lng = (data["longitude"] as? NSNumber)?.doubleValue ?? (data["lng"] as? NSNumber)?.doubleValue,
              lat != 0 || lng != 0 else { return nil }
        latitude = lat
        longitude = lng
        heading = (data["heading"] as? NSNumber)?.doubleValue
        speed = (data["speed"] as? NSNumber)?.doubleValue
        if let stamp = data["updatedAt"] as? Timestamp {
            updatedAt = stamp.dateValue()
        } else if let text = data["updatedAt"] as? String {
            updatedAt = ISO8601DateFormatter().date(from: text)
        } else {
            updatedAt = nil
        }
    }
}

/// Live positions of the riders a screen is showing. It listens only while
/// that screen is open (`watch` on appear, `stop` on disappear), one small
/// document per rider, so a closed screen costs nothing.
@MainActor
final class RiderPositionsWatcher: ObservableObject {
    @Published private(set) var positions: [String: RiderPosition] = [:]
    private var listeners: [String: ListenerRegistration] = [:]

    /// More riders than the shop will have; keeps the listeners bounded.
    private static let limit = 30

    /// Listens to exactly these riders: new ones are added, the rest dropped.
    func watch(_ riderIds: [String]) {
        let wanted = Set(riderIds.filter { !$0.isEmpty }.prefix(Self.limit))
        for (id, listener) in listeners where !wanted.contains(id) {
            listener.remove()
            listeners[id] = nil
            positions[id] = nil
        }
        let db = Firestore.firestore()
        for id in wanted where listeners[id] == nil {
            listeners[id] = db.collection("drivers").document(id).collection("telemetry").document("live")
                .addSnapshotListener { [weak self] snapshot, _ in
                    let position = snapshot?.data().flatMap { RiderPosition(data: $0) }
                    Task { @MainActor in
                        guard let self, self.listeners[id] != nil else { return }
                        self.positions[id] = position
                    }
                }
        }
    }

    func stop() {
        listeners.values.forEach { $0.remove() }
        listeners = [:]
    }
}
