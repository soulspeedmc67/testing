import SwiftUI
import WidgetKit
import ActivityKit

/// Mirrors the app's design tokens (Core/DesignSystem/Colors.swift), which the
/// extension cannot import. The card colour is the web tracker's `#16171B`.
private enum Palette {
    static let card = Color(red: 22 / 255, green: 23 / 255, blue: 27 / 255)
    static let brand = Color(red: 255 / 255, green: 91 / 255, blue: 0 / 255)          // #FF5B00
    static let brandText = Color(red: 255 / 255, green: 106 / 255, blue: 26 / 255)     // #FF6A1A
    static let midnight = Color(red: 6 / 255, green: 24 / 255, blue: 56 / 255)         // #061838
    static let success = Color(red: 34 / 255, green: 197 / 255, blue: 94 / 255)        // #22C55E
    static let danger = Color(red: 244 / 255, green: 63 / 255, blue: 94 / 255)         // #F43F5E
    static let secondary = Color(red: 203 / 255, green: 213 / 255, blue: 225 / 255)    // #CBD5E1
    static let muted = Color(red: 160 / 255, green: 171 / 255, blue: 192 / 255)        // #A0ABC0
    static let faint = Color(red: 130 / 255, green: 144 / 255, blue: 164 / 255)        // #8290A4
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
                    RiderAvatar(name: context.state.driverName, size: 40)
                        .padding(.leading, 2)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    ExpandedETAView(context: context)
                        .padding(.trailing, 2)
                }
                DynamicIslandExpandedRegion(.center) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(context.state.stage.headline(riderName: context.state.driverName))
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(.white)
                            .lineLimit(1)
                        StatusLine(context: context, size: 12)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    OrderProgressRail(stage: context.state.stage, progress: context.state.progress, markerSize: 22)
                        .padding(.top, 8)
                        .padding(.horizontal, 4)
                }
            } compactLeading: {
                StageGlyph(stage: context.state.stage, size: 22)
            } compactTrailing: {
                CompactETAView(context: context)
            } minimal: {
                StageRing(stage: context.state.stage, progress: context.state.progress)
            }
            .keylineTint(Palette.brand)
        }
    }
}

// MARK: - Lock Screen / banner

private struct LockScreenLiveActivityView: View {
    let context: ActivityViewContext<DASHitOrderAttributes>

    var body: some View {
        let state = context.state
        let stage = state.stage

        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .center, spacing: 8) {
                Text("DASHit Express Hub · Anantnag")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(Palette.muted)
                    .lineLimit(1)
                Spacer(minLength: 8)
                Wordmark(size: 15)
            }

            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(stage.headline(riderName: state.driverName))
                    .font(.system(size: 19, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                Spacer(minLength: 8)
                if !stage.isFinished {
                    CountdownText(context: context)
                        .font(.system(size: 19, weight: .bold))
                        .foregroundColor(Palette.brandText)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 66, alignment: .trailing)
                }
            }
            .padding(.top, 6)

            StatusLine(context: context, size: 12)
                .padding(.top, 3)

            OrderProgressRail(stage: stage, progress: state.progress, markerSize: 24)
                .padding(.top, 12)

            HStack(spacing: 8) {
                if let rider = state.driverName, !rider.isEmpty {
                    RiderAvatar(name: rider, size: 22)
                    Text(rider)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    Text("· Delivery partner")
                        .font(.system(size: 12))
                        .foregroundColor(Palette.muted)
                        .lineLimit(1)
                }
                Spacer(minLength: 8)
                if stage == .onTheWay, let code = context.attributes.deliveryCode, !code.isEmpty {
                    // What the rider will ask for at the door.
                    (Text("Code ").foregroundColor(Palette.muted) + Text(code).foregroundColor(.white).bold())
                        .font(.system(size: 13, weight: .medium, design: .monospaced))
                        .lineLimit(1)
                } else {
                    Text("\(context.attributes.itemCount) item\(context.attributes.itemCount == 1 ? "" : "s") · ₹\(Int(context.attributes.totalAmount))")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(Palette.muted)
                        .lineLimit(1)
                }
            }
            .padding(.top, 10)
        }
        .padding(16)
    }
}

// MARK: - Building blocks

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

private struct StatusLine: View {
    let context: ActivityViewContext<DASHitOrderAttributes>
    let size: CGFloat

    var body: some View {
        let stage = context.state.stage
        HStack(spacing: 6) {
            Text(stage.badgeText)
                .font(.system(size: size, weight: .semibold))
                .foregroundColor(stage == .cancelled ? Palette.danger : Palette.success)
            Text("|")
                .font(.system(size: size, weight: .light))
                .foregroundColor(Palette.faint)
            Text(stage.subtitle(etaMinutes: context.state.etaMinutes, itemCount: context.attributes.itemCount))
                .font(.system(size: size, weight: .medium))
                .foregroundColor(Palette.secondary)
                .lineLimit(1)
        }
    }
}

private struct ExpandedETAView: View {
    let context: ActivityViewContext<DASHitOrderAttributes>

    var body: some View {
        let stage = context.state.stage
        if stage.isFinished {
            Image(systemName: stage == .delivered ? "checkmark.circle.fill" : "xmark.circle.fill")
                .font(.system(size: 30))
                .foregroundColor(stage == .delivered ? Palette.success : Palette.danger)
        } else {
            VStack(alignment: .trailing, spacing: 0) {
                CountdownText(context: context)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(Palette.brandText)
                    .multilineTextAlignment(.trailing)
                    .frame(width: 72, alignment: .trailing)
                Text("ETA")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(Palette.muted)
            }
        }
    }
}

private struct CompactETAView: View {
    let context: ActivityViewContext<DASHitOrderAttributes>

    var body: some View {
        let stage = context.state.stage
        if stage.isFinished {
            Image(systemName: stage == .delivered ? "checkmark" : "xmark")
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(stage == .delivered ? Palette.success : Palette.danger)
        } else {
            CountdownText(context: context)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(Palette.brandText)
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: 44, alignment: .trailing)
        }
    }
}

/// Initials on midnight when a rider is assigned, otherwise the scooter.
private struct RiderAvatar: View {
    let name: String?
    let size: CGFloat

    var body: some View {
        ZStack {
            Circle().fill(Palette.midnight)
            Circle().strokeBorder(Palette.brand, lineWidth: max(1.5, size * 0.05))
            if let initials = Self.initials(from: name) {
                Text(initials)
                    .font(.system(size: size * 0.38, weight: .bold))
                    .foregroundColor(.white)
            } else {
                Image(systemName: "scooter")
                    .font(.system(size: size * 0.42, weight: .semibold))
                    .foregroundColor(.white)
            }
        }
        .frame(width: size, height: size)
    }

    static func initials(from name: String?) -> String? {
        guard let trimmed = name?.trimmingCharacters(in: .whitespaces), !trimmed.isEmpty else { return nil }
        let letters = trimmed
            .split(separator: " ")
            .prefix(2)
            .compactMap { $0.first }
            .map { String($0) }
            .joined()
            .uppercased()
        return letters.isEmpty ? nil : letters
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

private struct Wordmark: View {
    let size: CGFloat

    var body: some View {
        (Text("dash").foregroundColor(.white) + Text("it").foregroundColor(Palette.brand))
            .font(.system(size: size, weight: .black).italic())
    }
}
