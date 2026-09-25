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
    /// False while `routePath` is only the straight line, shown until a
    /// router answers.
    @Published var isRoadRoute = false

    private var orderListener: ListenerRegistration?
    private var trackingListener: ListenerRegistration?
    private var countdownTimer: Timer?
    private var hasCenteredOnAddress = false
    private var hasFramedRoute = false
    private var lastRouteOrigin: CLLocationCoordinate2D?
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
        lastRouteOrigin = nil
        startTracking(orderId: replacement.id, initialOrder: replacement)
    }

    /// Re-routes when the rider has moved more than ~60 m since the last route,
    /// so a stream of GPS ticks does not flood the routers with requests.
    private func updateRoute() {
        guard let order = activeOrder, !order.status.stage.isFinished else {
            routeTask?.cancel()
            routePath = []
            isRoadRoute = false
            return
        }
        let origin = riderLocation?.coordinate ?? DeliveryEta.hub
        let destination = order.deliveryAddress.coordinate
        if let last = lastRouteOrigin, !routePath.isEmpty {
            let moved = CLLocation(latitude: last.latitude, longitude: last.longitude)
                .distance(from: CLLocation(latitude: origin.latitude, longitude: origin.longitude))
            if moved < 60 { return }
        }
        lastRouteOrigin = origin
        routeTask?.cancel()
        routeTask = Task { [weak self] in
            let path = await RoadRouter.path(from: origin, to: destination)
            guard !Task.isCancelled,
                  let routed = self?.apply(path, origin: origin, destination: destination),
                  !routed else { return }
            // A cold start or a patchy connection must not leave the ride
            // unrouted, so ask again shortly. `self` stays weak across the
            // wait, so closing the screen still releases this model.
            try? await Task.sleep(for: .seconds(12))
            guard !Task.isCancelled else { return }
            self?.retryRoute()
        }
    }

    /// Shows a routed path; true when it was one. Without one the straight
    /// line stands in, but never over a road line from an earlier fix.
    private func apply(_ path: [CLLocationCoordinate2D]?, origin: CLLocationCoordinate2D, destination: CLLocationCoordinate2D) -> Bool {
        if let path {
            withAnimation(.easeInOut(duration: 0.4)) {
                routePath = path
                isRoadRoute = true
            }
            frameOnce(RoadRouter.boundingRect(of: path))
            return true
        }
        if !isRoadRoute {
            routePath = [origin, destination]
            frameOnce(RoadRouter.boundingRect(of: routePath))
        }
        return false
    }

    private func retryRoute() {
        lastRouteOrigin = nil
        updateRoute()
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
