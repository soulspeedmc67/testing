import Foundation
import ActivityKit

/// Starts, updates and ends the order Live Activity (Lock Screen + Dynamic Island).
/// Called from the main actor: checkout, the tracking screen and ActiveOrderStore.
final class LiveActivityManager {
    static let shared = LiveActivityManager()

    private var currentActivity: Activity<DASHitOrderAttributes>?

    /// The ETA the activity was last given. `etaMinutes` on the order is "minutes
    /// remaining when it was set", so the arrival time is only recomputed when that
    /// number changes, not on every unrelated order update.
    private var lastEta: (orderId: String, minutes: Int, arrival: Date)?

    private init() {}

    func startActivity(for order: Order) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            #if DEBUG
            print("⚠️ [ActivityKit] Live Activities are disabled by user or system.")
            #endif
            return
        }

        // Only one order is tracked at a time; clear any left over from earlier orders.
        for activity in Activity<DASHitOrderAttributes>.activities where activity.attributes.orderId != order.id {
            Task { await activity.end(nil, dismissalPolicy: .immediate) }
        }

        let attributes = DASHitOrderAttributes(
            orderId: order.id,
            itemCount: order.items.reduce(0) { $0 + $1.qty },
            totalAmount: order.grandTotal,
            placedAt: Date(timeIntervalSince1970: order.createdAt)
        )
        let state = contentState(for: order)

        do {
            let activity = try Activity<DASHitOrderAttributes>.request(
                attributes: attributes,
                content: ActivityContent(state: state, staleDate: nil),
                pushType: nil
            )
            currentActivity = activity
            #if DEBUG
            print("⚡️ [ActivityKit] Started Live Activity with ID: \(activity.id)")
            #endif
        } catch {
            #if DEBUG
            print("❌ [ActivityKit] Failed to start Live Activity: \(error.localizedDescription)")
            #endif
        }
    }

    /// Pushes the latest order state, and ends the activity once the order is
    /// delivered or cancelled (leaving the final state up for 15 seconds).
    func sync(with order: Order, tracking: DriverLiveTracking? = nil) {
        guard let activity = activity(for: order.id) else { return }
        let state = contentState(for: order, tracking: tracking)

        if order.status.stage.isFinished {
            currentActivity = nil
            lastEta = nil
            Task {
                await activity.end(
                    ActivityContent(state: state, staleDate: nil),
                    dismissalPolicy: .after(Date().addingTimeInterval(15))
                )
            }
        } else {
            Task {
                await activity.update(
                    ActivityContent(state: state, staleDate: state.estimatedArrival.addingTimeInterval(15 * 60))
                )
            }
        }
    }

    func updateActivity(for order: Order) {
        sync(with: order)
    }

    func endActivity() {
        guard let activity = currentActivity else { return }
        currentActivity = nil
        lastEta = nil
        Task {
            await activity.end(nil, dismissalPolicy: .after(Date().addingTimeInterval(15)))
        }
    }

    // MARK: - Private

    private func activity(for orderId: String) -> Activity<DASHitOrderAttributes>? {
        if let current = currentActivity, current.attributes.orderId == orderId {
            return current
        }
        // After a relaunch this manager starts empty; re-attach to the activity
        // that is still running on the Lock Screen.
        guard let running = Activity<DASHitOrderAttributes>.activities.first(where: { $0.attributes.orderId == orderId }) else {
            return nil
        }
        currentActivity = running
        let state = running.content.state
        lastEta = (orderId: orderId, minutes: state.etaMinutes, arrival: state.estimatedArrival)
        return running
    }

    private func contentState(for order: Order, tracking: DriverLiveTracking? = nil) -> DASHitOrderAttributes.ContentState {
        // The rider's live ETA (from the driver app) wins over the checkout estimate.
        let minutes = max(tracking?.etaMinutes ?? order.etaMinutes ?? 8, 0)
        let arrival: Date
        if let last = lastEta, last.orderId == order.id {
            arrival = last.minutes == minutes
                ? last.arrival
                : Date().addingTimeInterval(TimeInterval(minutes * 60))
        } else {
            arrival = Date(timeIntervalSince1970: order.createdAt).addingTimeInterval(TimeInterval(minutes * 60))
        }
        lastEta = (orderId: order.id, minutes: minutes, arrival: arrival)

        return DASHitOrderAttributes.ContentState(
            status: order.status.rawValue,
            etaMinutes: minutes,
            driverName: order.driverName,
            progress: order.status.stage.progress(live: tracking?.progress),
            estimatedArrival: arrival
        )
    }
}
