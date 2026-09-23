import Foundation
import SwiftUI
import MapKit
import FirebaseFirestore
import ActivityKit

@MainActor
final class LiveTrackingViewModel: ObservableObject {
    @Published var activeOrder: Order?
    @Published var riderLocation: DriverLiveTracking?
    @Published var secondsRemainingForModification: Int = 60
    @Published var isModificationWindowActive: Bool = true
    /// Starts on Anantnag rather than `.automatic`, which with no pins yet
    /// shows the whole subcontinent.
    @Published var cameraPosition: MapCameraPosition = .region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 33.7311, longitude: 75.1487),
            span: MKCoordinateSpan(latitudeDelta: 0.02, longitudeDelta: 0.02)
        )
    )

    /// Road route the rider takes to the door (from the rider, or from the hub
    /// until a rider is assigned). A straight dashed line stands in when Apple
    /// Maps has no route.
    @Published var route: MKRoute?
    @Published var fallbackPath: [CLLocationCoordinate2D] = []

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

    func cancelOrder(reason: String = "Customer cancelled") async -> Bool {
        guard let order = activeOrder else { return false }
        do {
            try await FirestoreService.shared.cancelOrder(orderId: order.id, reason: reason)
            HapticsManager.shared.warning()
            return true
        } catch {
            return false
        }
    }

    private func startModificationCountdown() {
        countdownTimer?.invalidate()
        secondsRemainingForModification = 60
        isModificationWindowActive = true

        countdownTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] timer in
            guard let self = self else { return }
            Task { @MainActor in
                if self.secondsRemainingForModification > 0 {
                    self.secondsRemainingForModification -= 1
                } else {
                    self.isModificationWindowActive = false
                    timer.invalidate()
                }
            }
        }
    }

    /// Re-routes when the rider has moved more than ~60 m since the last route,
    /// so a stream of GPS ticks does not flood MapKit with direction requests.
    private func updateRoute() {
        guard let order = activeOrder, !order.status.stage.isFinished else {
            route = nil
            fallbackPath = []
            return
        }
        let origin = riderLocation?.coordinate ?? DeliveryEta.hub
        let destination = order.deliveryAddress.coordinate
        if let last = lastRouteOrigin, route != nil || !fallbackPath.isEmpty {
            let moved = CLLocation(latitude: last.latitude, longitude: last.longitude)
                .distance(from: CLLocation(latitude: origin.latitude, longitude: origin.longitude))
            if moved < 60 { return }
        }
        lastRouteOrigin = origin
        routeTask?.cancel()
        routeTask = Task { [weak self] in
            let request = MKDirections.Request()
            request.source = MKMapItem(placemark: MKPlacemark(coordinate: origin))
            request.destination = MKMapItem(placemark: MKPlacemark(coordinate: destination))
            request.transportType = .automobile
            let response = try? await MKDirections(request: request).calculate()
            guard let self = self, !Task.isCancelled else { return }
            if let best = response?.routes.first {
                withAnimation(.easeInOut(duration: 0.4)) {
                    self.route = best
                    self.fallbackPath = []
                }
                self.frameOnce(best.polyline.boundingMapRect)
            } else {
                self.route = nil
                self.fallbackPath = [origin, destination]
                let a = MKMapPoint(origin)
                let b = MKMapPoint(destination)
                self.frameOnce(MKMapRect(x: min(a.x, b.x), y: min(a.y, b.y), width: abs(a.x - b.x), height: abs(a.y - b.y)))
            }
        }
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
    }
}
