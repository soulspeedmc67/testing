import SwiftUI
import CoreLocation

/// The live order, docked in a pill above the tab bar: the stage glyph in a
/// progress ring, the live status and the ETA. Status changes roll through it
/// in place; tap it for the live map.
struct OrderStatusPill: View {
    let order: Order
    var tracking: DriverLiveTracking? = nil
    var onOpen: () -> Void
    var onDismiss: () -> Void

    static let height: CGFloat = 58

    private var stage: DeliveryStage { order.status.stage }
    private var itemCount: Int { order.items.reduce(0) { $0 + $1.qty } }
    /// From how far the rider really is (road ≈ 1.3× the straight line, ~20 km/h
    /// in town), not the rider phone's own guess, which ran far off.
    private var etaMinutes: Int {
        guard let tracking else { return order.etaMinutes ?? 8 }
        let door = order.deliveryAddress.coordinate
        let metres = DeliveryEta.haversineKm(from: tracking.coordinate, to: door) * 1000 * 1.3
        return max(1, Int((metres / 5.5 / 60).rounded(.up))) + LiveTrackingViewModel.shownMarginMinutes
    }

    /// Short, so nothing is cut off: no rider name here.
    private var headline: String {
        if order.isAwaitingPickup { return "Picking up your order" }
        switch stage {
        case .onTheWay: return "On the way"
        case .delivered: return "Delivered"
        case .cancelled: return "Cancelled"
        default: return stage.headline(riderName: nil)
        }
    }
    private var progress: Double { stage.progress(live: tracking?.progress) }

    private var accent: Color {
        switch stage {
        case .delivered: return .positive
        case .cancelled: return .danger
        default: return .brandOrange
        }
    }

    private var subtitle: String {
        if order.isAwaitingPickup { return "Your rider is collecting it from the store" }
        return stage.subtitle(etaMinutes: etaMinutes, itemCount: itemCount)
    }

    /// Shown until the order is delivered or cancelled.
    private var deliveryCode: String? {
        guard !stage.isFinished, let code = order.otp?.trimmingCharacters(in: .whitespaces), !code.isEmpty else { return nil }
        return code
    }

    var body: some View {
        HStack(spacing: 11) {
            ring

            VStack(alignment: .leading, spacing: 2) {
                Text(headline)
                    .font(.system(size: 14.5, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.85)
                    .id(stage)
                    .transition(.push(from: .bottom))
                HStack(spacing: 5) {
                    if !stage.isFinished {
                        Image(systemName: "circle.fill")
                            .font(.system(size: 6))
                            .foregroundColor(.positive)
                            .symbolEffect(.pulse, options: .repeating)
                            .accessibilityHidden(true)
                    }
                    Text(subtitle)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.textSecondary)
                        .lineLimit(1)
                        .contentTransition(.interpolate)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .clipped()

            // The code the rider asks for at the door, where it can't be missed.
            if let code = deliveryCode {
                VStack(spacing: 0) {
                    Text("OTP")
                        .font(.system(size: 8.5, weight: .heavy))
                        .tracking(1)
                        .foregroundColor(.textSecondary)
                    Text(code)
                        .font(.system(size: 15, weight: .heavy, design: .rounded))
                        .tracking(1.5)
                        .monospacedDigit()
                        .foregroundColor(.white)
                }
                .padding(.horizontal, 9)
                .padding(.vertical, 4)
                .background(Color.white.opacity(0.1), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Delivery code \(code.map(String.init).joined(separator: " "))")
                .transition(.scale.combined(with: .opacity))
            }

            trailing
        }
        .padding(.leading, 9)
        .padding(.trailing, 9)
        .frame(height: Self.height)
        .background(Capsule().fill(Color.trackerCard))
        .overlay(
            Capsule().strokeBorder(
                LinearGradient(colors: [Color.white.opacity(0.16), Color.white.opacity(0.05)], startPoint: .top, endPoint: .bottom),
                lineWidth: 1
            )
        )
        // Always the dark panel, so its text tokens resolve to their dark values.
        .environment(\.colorScheme, .dark)
        .shadow(color: Color.black.opacity(0.35), radius: 18, x: 0, y: 10)
        .contentShape(Capsule())
        .onTapGesture {
            HapticsManager.shared.light()
            onOpen()
        }
        .animation(.dashitSpring, value: stage)
        .animation(.easeInOut(duration: 0.6), value: progress)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isButton)
        .accessibilityLabel("\(headline). \(subtitle)")
        .accessibilityHint("Opens live tracking")
        .accessibilityActions {
            if stage.isFinished {
                Button("Dismiss", action: onDismiss)
            }
        }
    }

    /// Stage glyph inside a ring that fills as the order moves along.
    private var ring: some View {
        ZStack {
            Circle()
                .fill(Color.white.opacity(0.06))
            Circle()
                .stroke(Color.white.opacity(0.12), lineWidth: 3)
            Circle()
                .trim(from: 0, to: CGFloat(stage == .cancelled ? 1 : progress))
                .stroke(accent, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Image(systemName: stage.symbol)
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(.white)
                .contentTransition(.symbolEffect(.replace))
        }
        .padding(1.5)
        .frame(width: 42, height: 42)
    }

    /// Minutes to the door once a rider has the order; before that a quiet
    /// chevron (there is no honest arrival time yet); a dismiss button once it's over.
    @ViewBuilder
    private var trailing: some View {
        if stage.isFinished {
            Button {
                HapticsManager.shared.light()
                onDismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.textSecondary)
                    .frame(width: 36, height: 36)
                    .background(Color.white.opacity(0.1), in: Circle())
                    .contentShape(Circle())
            }
            .buttonStyle(PressableButtonStyle(scale: 0.85))
            .transition(.scale.combined(with: .opacity))
        } else if stage != .onTheWay {
            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(.textSecondary)
                .frame(width: 36, height: 36)
                .background(Color.white.opacity(0.1), in: Circle())
                .transition(.scale.combined(with: .opacity))
        } else {
            VStack(spacing: -1) {
                Text("\(etaMinutes)")
                    .font(.system(size: 17, weight: .heavy, design: .rounded))
                    .monospacedDigit()
                    .contentTransition(.numericText(value: Double(etaMinutes)))
                Text("MIN")
                    .font(.system(size: 8.5, weight: .heavy))
                    .tracking(0.8)
            }
            .foregroundColor(.white)
            .frame(width: 44, height: 40)
            .background(Color.brandOrange, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .animation(.dashitSpring, value: etaMinutes)
            .transition(.scale.combined(with: .opacity))
        }
    }
}
