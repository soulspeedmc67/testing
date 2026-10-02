import SwiftUI
import WidgetKit
import ActivityKit

/// Mirrors the app's design tokens (Core/DesignSystem/Colors.swift), which the
/// extension cannot import. The card colour is the web tracker's `#16171B`.
private enum Palette {
    static let card = Color(red: 22 / 255, green: 23 / 255, blue: 27 / 255)
    static let brand = Color(red: 255 / 255, green: 91 / 255, blue: 0 / 255)          // #FF5B00
    static let brandText = Color(red: 255 / 255, green: 106 / 255, blue: 26 / 255)     // #FF6A1A
    static let success = Color(red: 34 / 255, green: 197 / 255, blue: 94 / 255)        // #22C55E
    static let danger = Color(red: 244 / 255, green: 63 / 255, blue: 94 / 255)         // #F43F5E
    static let secondary = Color(red: 203 / 255, green: 213 / 255, blue: 225 / 255)    // #CBD5E1
    static let muted = Color(red: 160 / 255, green: 171 / 255, blue: 192 / 255)        // #A0ABC0
}

struct DASHitLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: DASHitOrderAttributes.self) { context in
            LockScreenLiveActivityView(context: context)
                .activityBackgroundTint(Palette.card)
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    StageGlyph(stage: context.state.stage, size: 36)
                        .padding(.leading, 2)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    TrailingTime(context: context, size: 20)
                        .padding(.trailing, 2)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(Journey(context: context).title)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    JourneyRail(context: context, markerSize: 22)
                        .padding(.top, 8)
                        .padding(.horizontal, 4)
                }
            } compactLeading: {
                StageGlyph(stage: context.state.stage, size: 22)
            } compactTrailing: {
                TrailingTime(context: context, size: 14)
                    .frame(maxWidth: 52, alignment: .trailing)
            } minimal: {
                StageRing(stage: context.state.stage, progress: Journey(context: context).progress)
            }
            .keylineTint(Palette.brand)
        }
    }
}

// MARK: - Lock Screen / banner

/// The stage with the wordmark, a line on what's happening (with the time left
/// while riding), the scooter on its way, and the order itself underneath:
/// items and total, and the code for the rider once it's on the way.
private struct LockScreenLiveActivityView: View {
    let context: ActivityViewContext<DASHitOrderAttributes>

    var body: some View {
        let journey = Journey(context: context)
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(journey.title)
                    .font(.system(size: 19, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                Spacer(minLength: 8)
                Wordmark(size: 15)
            }

            HStack(alignment: .firstTextBaseline, spacing: 8) {
                StatusLine(context: context, journey: journey)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(Palette.secondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.85)
                Spacer(minLength: 8)
                if !journey.isLate {
                    TrailingTime(context: context, size: 17)
                }
            }
            .padding(.top, 3)

            JourneyRail(context: context, markerSize: 24)
                .padding(.top, 12)

            HStack(spacing: 8) {
                Text(orderSummary)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(Palette.muted)
                    .lineLimit(1)
                Spacer(minLength: 8)
                if journey.stage == .onTheWay, let code = context.attributes.deliveryCode, !code.isEmpty {
                    // What the rider asks for at the door.
                    (Text("Code ").foregroundColor(Palette.muted) + Text(code).foregroundColor(.white).bold())
                        .font(.system(size: 13, weight: .medium, design: .monospaced))
                        .lineLimit(1)
                }
            }
            .padding(.top, 10)
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 16)
    }

    private var orderSummary: String {
        let count = context.attributes.itemCount
        let items = "\(count) item\(count == 1 ? "" : "s")"
        return "\(items) · ₹\(Int(context.attributes.totalAmount.rounded()))"
    }
}

/// One line on what's happening now, under the stage.
private struct StatusLine: View {
    let context: ActivityViewContext<DASHitOrderAttributes>
    let journey: Journey

    var body: some View {
        if journey.isLate {
            Text("Your rider is just around the corner")
        } else {
            switch journey.stage {
            case .placed:
                Text("We've got your order")
            case .packing:
                Text(packingLine)
            case .onTheWay:
                Text("Arriving by ") + Text(context.state.estimatedArrival, style: .time)
            case .delivered:
                Text("Handed over at your door")
            case .cancelled:
                Text("This order was cancelled")
            }
        }
    }

    private var packingLine: String {
        let count = context.attributes.itemCount
        return count > 0 ? "Packing \(count) item\(count == 1 ? "" : "s") at the store" : "Packing at the store"
    }
}

// MARK: - Building blocks

/// Where the order is, worked out from the clock each time the card redraws
/// (on every update, at least once a minute while it's open, and at the
/// arrival time, when the card goes stale).
private struct Journey {
    let stage: DeliveryStage
    /// The arrival time has passed and the order isn't in yet.
    let isLate: Bool
    /// 0–1 along the rail: the share of the promised time gone by. The scooter
    /// stops short of the door until the order is actually delivered.
    let progress: Double

    init(context: ActivityViewContext<DASHitOrderAttributes>) {
        stage = context.state.stage
        let now = Date()
        let start = context.attributes.placedAt
        let end = context.state.estimatedArrival
        isLate = !stage.isFinished && (context.isStale || now >= end)
        switch stage {
        case .delivered:
            progress = 1
        case .cancelled:
            progress = 0
        default:
            let span = max(60, end.timeIntervalSince(start))
            let gone = now.timeIntervalSince(start) / span
            progress = isLate ? 0.94 : min(0.94, max(0.04, gone))
        }
    }

    var title: String {
        if isLate { return "Almost there" }
        switch stage {
        case .placed: return "Order placed"
        case .packing: return "Packing your order"
        case .onTheWay: return "On the way"
        case .delivered: return "Delivered"
        case .cancelled: return "Order cancelled"
        }
    }
}

/// The rail with the scooter placed by the clock.
private struct JourneyRail: View {
    let context: ActivityViewContext<DASHitOrderAttributes>
    let markerSize: CGFloat

    var body: some View {
        let journey = Journey(context: context)
        OrderProgressRail(
            stage: journey.stage,
            progress: journey.progress,
            markerSize: markerSize,
            symbol: journey.stage.isFinished ? nil : "scooter"
        )
        .animation(.easeInOut(duration: 1.2), value: journey.progress)
    }
}

/// The right-hand side: a countdown while riding, a friendly "any minute now"
/// once the time is up (never 0:00), a tick or a cross when it's over.
private struct TrailingTime: View {
    let context: ActivityViewContext<DASHitOrderAttributes>
    let size: CGFloat

    var body: some View {
        let journey = Journey(context: context)
        switch journey.stage {
        case .delivered:
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: size))
                .foregroundColor(Palette.success)
        case .cancelled:
            Image(systemName: "xmark.circle.fill")
                .font(.system(size: size))
                .foregroundColor(Palette.danger)
        case .onTheWay where journey.isLate:
            Text("Any minute now")
                .font(.system(size: size * 0.75, weight: .semibold))
                .foregroundColor(Palette.brandText)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        case .onTheWay:
            CountdownText(context: context)
                .font(.system(size: size, weight: .bold))
                .foregroundColor(Palette.brandText)
                .multilineTextAlignment(.trailing)
                .frame(width: size * 3.3, alignment: .trailing)
        default:
            // No arrival time until a rider has the order.
            EmptyView()
        }
    }
}

/// Counts down to the ETA using the system timer, so it ticks without the app
/// pushing an update every second.
private struct CountdownText: View {
    let context: ActivityViewContext<DASHitOrderAttributes>

    var body: some View {
        let start = context.attributes.placedAt
        let end = max(context.state.estimatedArrival, start)
        Text(timerInterval: start...end, countsDown: true, showsHours: false)
            .monospacedDigit()
    }
}

private struct StageGlyph: View {
    let stage: DeliveryStage
    let size: CGFloat

    var body: some View {
        Image(systemName: stage == .onTheWay || stage == .placed ? "scooter" : stage.symbol)
            .font(.system(size: size * 0.5, weight: .bold))
            .foregroundColor(.white)
            .frame(width: size, height: size)
            .background(Circle().fill(stage == .delivered ? Palette.success : Palette.brand))
    }
}

/// Minimal presentation: stage glyph inside a progress ring.
private struct StageRing: View {
    let stage: DeliveryStage
    let progress: Double

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.white.opacity(0.2), lineWidth: 2.5)
            Circle()
                .trim(from: 0, to: CGFloat(progress))
                .stroke(stage == .delivered ? Palette.success : Palette.brand, style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Image(systemName: stage.symbol)
                .font(.system(size: 9, weight: .bold))
                .foregroundColor(.white)
        }
        .frame(width: 22, height: 22)
    }
}

/// The brand wordmark, as on the app's header: "dash" in white, "it" in orange.
private struct Wordmark: View {
    let size: CGFloat

    var body: some View {
        (Text("dash").foregroundColor(.white) + Text("it").foregroundColor(Palette.brand))
            .font(.system(size: size, weight: .black).italic())
    }
}
