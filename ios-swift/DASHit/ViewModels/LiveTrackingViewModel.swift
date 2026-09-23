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
    @Published var cameraPosition: MapCameraPosition = .automatic
    
    private var orderListener: ListenerRegistration?
    private var trackingListener: ListenerRegistration?
    private var countdownTimer: Timer?
    
    func startTracking(orderId: String) {
        orderListener?.remove()
        trackingListener?.remove()
        
        // Listen to main order document
        orderListener = FirestoreService.shared.listenOrder(orderId: orderId) { [weak self] order in
            guard let self = self, let order = order else { return }
            self.activeOrder = order
            
            // Update Dynamic Island Live Activity if active
            self.updateLiveActivity(for: order)
            
            // Adjust camera position to include delivery pin
            self.centerMap(on: order.deliveryAddress.coordinate)
        }
        
        // Listen to live driver GPS
        trackingListener = FirestoreService.shared.listenDriverTracking(orderId: orderId) { [weak self] tracking in
            guard let self = self, let tracking = tracking else { return }
            withAnimation(.easeInOut(duration: 1.0)) {
                self.riderLocation = tracking
            }
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
    
    private func centerMap(on coordinate: CLLocationCoordinate2D) {
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
