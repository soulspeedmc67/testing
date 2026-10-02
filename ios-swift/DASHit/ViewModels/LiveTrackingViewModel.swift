import Foundation
import SwiftUI
import MapKit
import FirebaseFirestore
import ActivityKit

@MainActor
final class LiveTrackingViewModel: ObservableObject {
    @Published var activeOrder: Order?
    @Published var riderLocation: DriverLiveTracking?
    /// Seconds left to add items or cancel, counted from the order's server
    /// timestamp, so leaving and reopening this screen never restarts it.
    @Published var secondsRemainingForModification: Int = 0
    @Published var isModificationWindowActive: Bool = false
    /// Starts on Anantnag rather than `.automatic`, which with no pins yet
    /// shows the whole subcontinent.
    @Published var cameraPosition: MapCameraPosition = .region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 33.7311, longitude: 75.1487),
            span: MKCoordinateSpan(latitudeDelta: 0.02, longitudeDelta: 0.02)
        )
    )

    /// The way the rider takes to the door along the roads (from the rider, or
    /// from the hub until a rider is assigned).
    @Published var routePath: [CLLocationCoordinate2D] = []
    /// Metres of road still to ride, from the rider's place on the road to the door.
    @Published private(set) var remainingMeters: Double?
    /// False while `routePath` is only the straight line, shown until a
    /// router answers.
    @Published var isRoadRoute = false
    /// Where to draw the rider: on the road when the phone's fix is within a few
    /// metres of it (GPS wanders off the road; the rider doesn't), else the fix.
    /// Keeps the rider on the drawn route instead of beside it.
    @Published private(set) var riderOnRoad: CLLocationCoordinate2D?
    /// How far off the road a fix can be and still count as on it.
    private static let snapMeters = 45.0

    private var orderListener: ListenerRegistration?
    private var trackingListener: ListenerRegistration?
    private var countdownTimer: Timer?
    private var hasCenteredOnAddress = false
    private var hasFramedRoute = false
    /// The whole road as last fetched; `routePath` is what is still ahead of the rider.
    private var fullRoute: [CLLocationCoordinate2D] = []
    private var routedTo: CLLocationCoordinate2D?
    private var routeFetchedAt = Date.distantPast
    private var totalMeters: Double?
    private var routeTask: Task<Void, Never>?

    func startTracking(orderId: String, initialOrder: Order? = nil) {
        orderListener?.remove()
        trackingListener?.remove()

        if let initialOrder, activeOrder == nil {
            activeOrder = initialOrder
            centerMap(on: initialOrder.deliveryAddress.coordinate)
            #if DEBUG
            if initialOrder.id == "DEMO-ORDER" {
                // Rider part-way between the hub and the door, for screenshots.
                let hub = DeliveryEta.hub
                let door = initialOrder.deliveryAddress.coordinate
                riderLocation = DriverLiveTracking(
                    lat: hub.latitude + (door.latitude - hub.latitude) * 0.45,
                    lng: hub.longitude + (door.longitude - hub.longitude) * 0.45,
                    etaMinutes: 5,
                    distanceFormatted: "650 m away",
                    statusText: "Arriving in ~5 mins",
                    progress: 74
                )
            }
            #endif
            updateRoute()
        }

        // Listen to main order document
        orderListener = FirestoreService.shared.listenOrder(orderId: orderId) { [weak self] order in
            guard let self = self, let order = order else { return }
            self.activeOrder = order
            self.refreshModificationWindow()

            // Update Dynamic Island Live Activity if active
            self.updateLiveActivity(for: order)

            // Centre on the delivery pin once; later updates leave the user's panning alone.
            if !self.hasCenteredOnAddress {
                self.centerMap(on: order.deliveryAddress.coordinate)
            }
            self.updateRoute()
        }

        // Listen to live driver GPS
        trackingListener = FirestoreService.shared.listenDriverTracking(orderId: orderId) { [weak self] tracking in
            guard let self = self, let tracking = tracking else { return }
            withAnimation(.easeInOut(duration: 1.0)) {
                self.riderLocation = tracking
            }
            self.updateRoute()
        }

        startModificationCountdown()
    }

    /// Cancels inside the change window. With `restoreCart` the items go back
    /// in the cart, as the web's cancel sheet offers.
    func cancelOrder(restoreCart: Bool = false, reason: String = "Customer cancelled") async -> Bool {
        guard let order = activeOrder, order.modifySecondsRemaining() > 0 else { return false }
        do {
            try await FirestoreService.shared.cancelOrder(orderId: order.id, reason: reason)
            Push.shared.orderChanged(order.id)
            if restoreCart {
                CartViewModel.shared.reorder(order.items)
            }
            HapticsManager.shared.warning()
            return true
        } catch {
            HapticsManager.shared.error()
            return false
        }
    }

    private func startModificationCountdown() {
        countdownTimer?.invalidate()
        refreshModificationWindow()

        countdownTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] timer in
            guard let self = self else { return }
            Task { @MainActor in
                self.refreshModificationWindow()
                if !self.isModificationWindowActive, self.activeOrder != nil {
                    timer.invalidate()
                }
            }
        }
    }

    private func refreshModificationWindow() {
        let seconds = activeOrder?.modifySecondsRemaining() ?? 0
        if seconds != secondsRemainingForModification {
            secondsRemainingForModification = seconds
        }
        let active = seconds > 0
        if active != isModificationWindowActive {
            withAnimation(.dashitSpring) {
                isModificationWindowActive = active
            }
        }
    }

    /// Follows the order that replaced this one after items were added.
    func switchTo(order replacement: Order) {
        activeOrder = replacement
        hasFramedRoute = false
        fullRoute = []
        routedTo = nil
        totalMeters = nil
        startTracking(orderId: replacement.id, initialOrder: replacement)
    }

    /// The road is fetched once, then only trimmed as the rider moves, so the
    /// part already ridden disappears at every GPS tick. It is fetched again
    /// only when the rider leaves the road (a detour) or the first try failed.
    private func updateRoute() {
        guard let order = activeOrder, !order.status.stage.isFinished else {
            routeTask?.cancel()
            routePath = []
            riderOnRoad = nil
            fullRoute = []
            remainingMeters = nil
            isRoadRoute = false
            return
        }
        // No road until a rider is assigned and their position is in: a route
        // drawn from the store before that was wrong as soon as it came. The
        // store copies the rider's last position onto the order when assigning.
        guard let rider = riderLocation?.coordinate else {
            routeTask?.cancel()
            routePath = []
            riderOnRoad = nil
            fullRoute = []
            remainingMeters = nil
            isRoadRoute = false
            return
        }
        let onTheWay = true
        let start = rider
        let destination = order.deliveryAddress.coordinate

        showAhead(of: rider, onTheWay: onTheWay)

        let sameDoor = routedTo.map { $0.latitude == destination.latitude && $0.longitude == destination.longitude } ?? false
        let sinceFetch = Date().timeIntervalSince(routeFetchedAt)
        let needsFetch: Bool
        if fullRoute.count < 2 || !sameDoor {
            needsFetch = true
        } else if !isRoadRoute {
            needsFetch = sinceFetch > 12
        } else if let on = RouteGeometry.nearest(fullRoute, to: start) {
            needsFetch = on.meters > Self.snapMeters && sinceFetch > 6
        } else {
            needsFetch = true
        }
        guard needsFetch else { return }

        routeFetchedAt = Date()
        routedTo = destination
        routeTask?.cancel()
        routeTask = Task { [weak self] in
            let path = await RoadRouter.path(from: start, to: destination)
            guard !Task.isCancelled, let self else { return }
            if let path, path.count > 1 {
                self.fullRoute = path
                self.isRoadRoute = true
                self.totalMeters = max(self.totalMeters ?? 0, RouteGeometry.length(path))
                self.showAhead(of: self.riderLocation?.coordinate, onTheWay: self.riderLocation != nil)
                self.frameOnce(RoadRouter.boundingRect(of: self.routePath))
                return
            }
            // No road yet: the straight line stands in, but never over a road found earlier.
            if !self.isRoadRoute {
                self.fullRoute = [start, destination]
                self.showAhead(of: self.riderLocation?.coordinate, onTheWay: false)
                self.frameOnce(RoadRouter.boundingRect(of: self.routePath))
            }
            // A cold start or a patchy connection must not leave the ride
            // unrouted, so ask again shortly. `self` stays weak across the
            // wait, so closing the screen still releases this model.
            try? await Task.sleep(for: .seconds(12))
            guard !Task.isCancelled else { return }
            self.updateRoute()
        }
    }

    /// Draws only the road still ahead of the rider, and keeps the distance left.
    private func showAhead(of rider: CLLocationCoordinate2D?, onTheWay: Bool) {
        var ahead = fullRoute
        var drawnAt = rider
        if isRoadRoute, onTheWay, let rider {
            ahead = RouteGeometry.trim(fullRoute, to: rider)
            if let on = RouteGeometry.nearest(fullRoute, to: rider), on.meters <= Self.snapMeters {
                drawnAt = on.point
            }
        }
        routePath = ahead
        withAnimation(.easeInOut(duration: 1.0)) { riderOnRoad = drawnAt }
        let length = RouteGeometry.length(ahead)
        // A straight line stands in as the crow flies, so add the bends.
        remainingMeters = ahead.count >= 2 ? length * (isRoadRoute ? 1 : 1.3) : nil
    }

    /// Minutes to show the shopper: the road left at the rider's pace, plus a
    /// few minutes' margin (parking, stairs, finding the door), so the promise
    /// is one the store keeps. Same as Android.
    static let shownMarginMinutes = 3

    var etaMinutes: Int? {
        guard let left = remainingMeters else { return nil }
        // A town average of ~20 km/h, nudged by how fast the rider is moving right now.
        let average = 5.5
        var speed = average
        if let now = riderLocation?.speed, now > 2 { speed = 0.6 * average + 0.4 * min(now, 12) }
        return max(1, Int((left / speed / 60).rounded(.up))) + Self.shownMarginMinutes
    }

    /// "650 m away", "1.2 km away" or "Arriving now".
    var distanceLine: String? {
        guard let left = remainingMeters else { return nil }
        if left < 40 { return "Arriving now" }
        if left < 1000 { return "\(Int((left / 10).rounded()) * 10) m away" }
        return String(format: "%.1f km away", left / 1000)
    }

    /// 0–100, how much of the ride is behind the rider.
    var progressPercent: Double? {
        guard let total = totalMeters, total > 0, let left = remainingMeters else { return nil }
        return min(max((1 - left / total) * 100, 0), 100)
    }

    /// Fits the whole ride on screen the first time a route arrives, leaving
    /// room below for the order card.
    private func frameOnce(_ rect: MKMapRect) {
        guard !hasFramedRoute else { return }
        hasFramedRoute = true
        hasCenteredOnAddress = true
        let side = max(rect.size.width, rect.size.height, 2500)
        let padded = MKMapRect(
            x: rect.midX - side * 0.8,
            y: rect.midY - side * 0.7,
            width: side * 1.6,
            height: side * 2.2
        )
        withAnimation(.easeInOut(duration: 0.6)) {
            cameraPosition = .rect(padded)
        }
    }

    private func centerMap(on coordinate: CLLocationCoordinate2D) {
        hasCenteredOnAddress = true
        self.cameraPosition = .region(
            MKCoordinateRegion(
                center: coordinate,
                span: MKCoordinateSpan(latitudeDelta: 0.015, longitudeDelta: 0.015)
            )
        )
    }

    private func updateLiveActivity(for order: Order) {
        // Updates while the order is live, ends with the final state once finished.
        LiveActivityManager.shared.sync(with: order)
    }

    deinit {
        orderListener?.remove()
        trackingListener?.remove()
        countdownTimer?.invalidate()
        routeTask?.cancel()
    }
}
