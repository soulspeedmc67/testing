import Foundation
import ActivityKit

/// Starts, updates and ends the order Live Activity (Lock Screen + Dynamic Island).
/// Called from the main actor: checkout, the tracking screen and ActiveOrderStore.
///
/// The activity stays up for as long as the order is in progress. Its stale
/// date is the arrival time: iOS redraws the card then, and the card shows
/// "almost there" instead of a countdown stuck at 0:00. It is put back if it disappears (swiped away, or ended by the system)
/// the next time the app opens or hears about the order, and it only ends once
/// the order is delivered or cancelled.
final class LiveActivityManager {
    static let shared = LiveActivityManager()

    private var currentActivity: Activity<DASHitOrderAttributes>?

    /// The ETA the activity was last given. `etaMinutes` on the order is "minutes
    /// remaining when it was set", so the arrival time is only recomputed when that
    /// number changes, not on every unrelated order update.
    private var lastEta: (orderId: String, minutes: Int, arrival: Date, riding: Bool)?
    /// When the rider collected each order (first seen on its way, or as the
    /// card on the Lock Screen already says): the ride's countdown starts here.
    private var pickups: [String: Date] = [:]

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

        // An order that replaced another (items added in the change window)
        // keeps the original arrival time rather than restarting the clock.
        if let replaced = order.replacesOrderId, let last = lastEta, last.orderId == replaced {
            lastEta = (orderId: order.id, minutes: last.minutes, arrival: last.arrival, riding: last.riding)
            if let pickup = pickups[replaced] { pickups[order.id] = pickup }
        }

        let attributes = DASHitOrderAttributes(
            orderId: order.id,
            itemCount: order.items.reduce(0) { $0 + $1.qty },
            totalAmount: order.grandTotal,
            placedAt: Date(timeIntervalSince1970: order.createdAt),
            deliveryCode: order.otp
        )
        let state = contentState(for: order)

        do {
            let content = ActivityContent(state: state, staleDate: Self.staleDate(of: state))
            // With a push address, the server keeps the card current while the
            // app is closed; without one (no push permission yet) the app does.
            let activity: Activity<DASHitOrderAttributes>
            if let withPush = try? Activity<DASHitOrderAttributes>.request(attributes: attributes, content: content, pushType: .token) {
                activity = withPush
            } else {
                activity = try Activity<DASHitOrderAttributes>.request(attributes: attributes, content: content, pushType: nil)
            }
            currentActivity = activity
            watchPushToken(of: activity)
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
    /// An order still in progress without an activity gets one again.
    func sync(with order: Order, tracking: DriverLiveTracking? = nil) {
        guard let activity = activity(for: order.id) else {
            if !order.status.stage.isFinished {
                startActivity(for: order)
            }
            return
        }
        let state = contentState(for: order, tracking: tracking)

        if order.status.stage.isFinished {
            currentActivity = nil
            lastEta = nil
            pickups[order.id] = nil
            Task {
                await activity.end(
                    ActivityContent(state: state, staleDate: nil),
                    dismissalPolicy: .after(Date().addingTimeInterval(15))
                )
            }
        } else {
            Task {
                await activity.update(ActivityContent(state: state, staleDate: Self.staleDate(of: state)))
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
        pickups.removeAll()
        Task {
            await activity.end(nil, dismissalPolicy: .after(Date().addingTimeInterval(15)))
        }
    }

    // MARK: - Private

    /// Activities whose push address is already being passed on to the server.
    private var watchedTokens = Set<String>()

    /// Hands the card's push address to the server each time iOS gives it one.
    private func watchPushToken(of activity: Activity<DASHitOrderAttributes>) {
        guard watchedTokens.insert(activity.id).inserted else { return }
        let orderId = activity.attributes.orderId
        Task {
            for await data in activity.pushTokenUpdates {
                let hex = data.map { String(format: "%02x", $0) }.joined()
                Push.shared.registerActivity(orderId: orderId, activityToken: hex)
            }
        }
    }

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
        watchPushToken(of: running)
        let state = running.content.state
        let margin = TimeInterval(LiveTrackingViewModel.shownMarginMinutes * 60)
        lastEta = (orderId: orderId, minutes: state.etaMinutes - LiveTrackingViewModel.shownMarginMinutes,
                   arrival: state.estimatedArrival.addingTimeInterval(-margin), riding: state.pickedUpAt != nil)
        if let pickup = state.pickedUpAt { pickups[orderId] = pickup }
        return running
    }

    /// The card goes stale (and says "almost there") at the arrival time, but
    /// only once the rider is on the way: before pickup there's no countdown.
    private static func staleDate(of state: DASHitOrderAttributes.ContentState) -> Date? {
        state.pickedUpAt == nil ? nil : state.estimatedArrival
    }

    private func contentState(for order: Order, tracking: DriverLiveTracking? = nil) -> DASHitOrderAttributes.ContentState {
        let riding = order.status.stage == .onTheWay
        let arrival: Date
        let minutes: Int
        var pickup: Date? = nil
        if riding {
            // The clock starts when the rider collects the order, not when it
            // was placed, so it can't run out while the order is at the store.
            let start = pickups[order.id] ?? Date()
            pickups[order.id] = start
            pickup = start
            // The rider's live ETA (from the driver app) wins over the estimate
            // of the ride (the checkout time less the packing).
            minutes = max(tracking?.etaMinutes ?? max(5, (order.etaMinutes ?? 8) - 3), 0)
            if let last = lastEta, last.orderId == order.id, last.riding {
                arrival = last.minutes == minutes ? last.arrival : Date().addingTimeInterval(TimeInterval(minutes * 60))
            } else {
                arrival = start.addingTimeInterval(TimeInterval(minutes * 60))
            }
        } else {
            minutes = max(order.etaMinutes ?? 8, 0)
            arrival = Date(timeIntervalSince1970: order.createdAt).addingTimeInterval(TimeInterval(minutes * 60))
        }
        lastEta = (orderId: order.id, minutes: minutes, arrival: arrival, riding: riding)

        // The shopper is shown the same extra minutes as in the app.
        let margin = LiveTrackingViewModel.shownMarginMinutes
        return DASHitOrderAttributes.ContentState(
            status: order.status.rawValue,
            etaMinutes: minutes + margin,
            driverName: order.driverName,
            progress: order.status.stage.progress(live: tracking?.progress),
            estimatedArrival: arrival.addingTimeInterval(TimeInterval(margin * 60)),
            pickedUpAt: pickup
        )
    }
}
