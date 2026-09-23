import Foundation
import ActivityKit

/// Manager coordinating iOS 17+ ActivityKit Live Activities and Dynamic Island
final class LiveActivityManager {
    static let shared = LiveActivityManager()
    
    private var currentActivity: Activity<DASHitOrderAttributes>?
    
    private init() {}
    
    func startActivity(for order: Order) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            #if DEBUG
            print("⚠️ [ActivityKit] Live Activities are disabled by user or system.")
            #endif
            return
        }
        
        // End any existing running activity first
        endActivity()
        
        let attributes = DASHitOrderAttributes(
            orderId: order.id,
            itemCount: order.items.count,
            totalAmount: order.grandTotal
        )
        
        let initialContentState = DASHitOrderAttributes.ContentState(
            status: order.status.rawValue,
            etaMinutes: order.etaMinutes ?? 8,
            driverName: order.driverName,
            progress: order.status.progress
        )
        
        do {
            let activity = try Activity<DASHitOrderAttributes>.request(
                attributes: attributes,
                content: .init(state: initialContentState, staleDate: nil),
                pushType: nil
            )
            self.currentActivity = activity
            #if DEBUG
            print("⚡️ [ActivityKit] Started Live Activity with ID: \(activity.id)")
            #endif
        } catch {
            #if DEBUG
            print("❌ [ActivityKit] Failed to start Live Activity: \(error.localizedDescription)")
            #endif
        }
    }
    
    func updateActivity(for order: Order) {
        guard let activity = currentActivity else { return }
        
        let updatedState = DASHitOrderAttributes.ContentState(
            status: order.status.rawValue,
            etaMinutes: order.etaMinutes ?? 8,
            driverName: order.driverName,
            progress: order.status.progress
        )
        
        Task {
            await activity.update(
                ActivityContent<DASHitOrderAttributes.ContentState>(
                    state: updatedState,
                    staleDate: nil
                )
            )
        }
    }
    
    func endActivity() {
        guard let activity = currentActivity else { return }
        
        Task {
            await activity.end(nil, dismissalPolicy: .after(Date().addingTimeInterval(15)))
            self.currentActivity = nil
        }
    }
}
