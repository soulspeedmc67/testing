import SwiftUI

/// Top-docked live order card, matching the web LiveOrderFloatingTracker
/// (Zomato-style live-activity banner). Tap to open live tracking; swipe up or
/// tap × to tuck it into the pill above the tab bar (RootView also does so after
/// ten seconds), or to dismiss a finished order.
struct LiveOrderFloatingTrackerView: View {
    let order: Order
    var tracking: DriverLiveTracking? = nil
    var onOpen: () -> Void
    var onClose: () -> Void
    /// Offered during the 60-second change window.
    var onAddItems: () -> Void = {}
    var onCancelOrder: () -> Void = {}

    @State private var dragOffset: CGFloat = 0

    private var stage: DeliveryStage { order.status.stage }
    private var itemCount: Int { order.items.reduce(0) { $0 + $1.qty } }
    private var cardShape: RoundedRectangle { RoundedRectangle(cornerRadius: 26, style: .continuous) }

    /// While riding, the driver app's own line ("Arriving in ~6 mins",
    /// "Rider is dropping a nearby order first") beats the checkout estimate.
    private var subtitle: String {
        if stage == .onTheWay, let line = tracking?.statusText, !line.isEmpty {
            return line
        }
        return stage.subtitle(etaMinutes: tracking?.etaMinutes ?? order.etaMinutes ?? 8, itemCount: itemCount)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 8) {
                Text("DASHit Express Hub · Anantnag")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.textMuted)
                    .lineLimit(1)
                Spacer(minLength: 8)
                (Text("dash").foregroundColor(.white) + Text("it").foregroundColor(.brandOrange))
                    .font(.system(size: 15, weight: .black).italic())
                    .accessibilityHidden(true)
                Button {
                    HapticsManager.shared.light()
                    onClose()
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.textSecondary)
                        .frame(width: 26, height: 26)
                        .background(Color.white.opacity(0.1), in: Circle())
                        .frame(width: 36, height: 36)
                        .contentShape(Circle())
                }
                .buttonStyle(PressableButtonStyle(scale: 0.85))
                .padding(.trailing, -6)
                .accessibilityLabel(stage.isFinished ? "Dismiss" : "Minimise tracker")
            }

            Text(stage.headline(riderName: order.driverName))
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.85)
                .padding(.top, 4)

            HStack(spacing: 8) {
                Text(stage.badgeText)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(stage == .cancelled ? .danger : .positive)
                Text("|")
                    .font(.system(size: 13, weight: .light))
                    .foregroundColor(.textFaint)
                Text(subtitle)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.textSecondary)
                    .lineLimit(1)
                if stage == .onTheWay, let code = order.otp, !code.isEmpty {
                    Spacer(minLength: 6)
                    (Text("Code ").foregroundColor(.textMuted) + Text(code).foregroundColor(.white).bold())
                        .font(.system(size: 13, weight: .medium, design: .monospaced))
                        .accessibilityLabel("Delivery code \(code)")
                }
            }
            .padding(.top, 3)

            OrderProgressRail(stage: stage, progress: stage.progress(live: tracking?.progress))
                .padding(.top, 14)

            // Add items or cancel while the order can still change. The row
            // disappears on its own when the 60 seconds run out.
            TimelineView(.periodic(from: .now, by: 1)) { context in
                if order.modifySecondsRemaining(at: context.date) > 0 {
                    HStack(spacing: 8) {
                        ModifyCountdownBadge(order: order)
                        Text("left to change")
                            .font(.system(size: 12.5, weight: .medium))
                            .foregroundColor(.textSecondary)
                            .lineLimit(1)
                            .minimumScaleFactor(0.85)
                        Spacer(minLength: 4)
                        Button(action: onCancelOrder) {
                            Text("Cancel")
                                .font(.system(size: 12.5, weight: .semibold))
                                .foregroundColor(.danger)
                                .fixedSize()
                                .padding(.horizontal, 10)
                                .frame(height: 30)
                                .background(Color.white.opacity(0.08), in: Capsule())
                        }
                        .buttonStyle(.pressable)
                        Button(action: onAddItems) {
                            Label("Add items", systemImage: "plus")
                                .font(.system(size: 12.5, weight: .bold))
                                .foregroundColor(.white)
                                .lineLimit(1)
                                .fixedSize()
                                .padding(.horizontal, 10)
                                .frame(height: 30)
                                .background(Color.brandOrange, in: Capsule())
                        }
                        .buttonStyle(.pressable)
                    }
                    .padding(.top, 14)
                    .transition(.opacity.combined(with: .move(edge: .top)))
                }
            }
        }
        .padding(.horizontal, 18)
        .padding(.top, 12)
        .padding(.bottom, 18)
        .background(Color.trackerCard, in: cardShape)
        .overlay(cardShape.strokeBorder(Color.white.opacity(0.1), lineWidth: 1))
        // Always the dark panel, so its text tokens resolve to their dark values.
        .environment(\.colorScheme, .dark)
        .shadow(color: Color.black.opacity(0.55), radius: 24, x: 0, y: 14)
        .contentShape(cardShape)
        .onTapGesture {
            HapticsManager.shared.light()
            onOpen()
        }
        .offset(y: dragOffset < 0 ? dragOffset : dragOffset * 0.25)
        .gesture(
            DragGesture(minimumDistance: 8)
                .onChanged { value in
                    dragOffset = value.translation.height
                }
                .onEnded { value in
                    let shouldClose = value.translation.height < -40 || value.predictedEndTranslation.height < -120
                    withAnimation(.dashitSpring) {
                        dragOffset = 0
                    }
                    if shouldClose {
                        HapticsManager.shared.light()
                        onClose()
                    }
                }
        )
        .frame(maxWidth: 440)
        .padding(.horizontal, 16)
        .accessibilityElement(children: .contain)
        .accessibilityHint("Opens live tracking")
    }
}

/// The tracker tucked away after its few seconds at the top: a pill docked
/// above the tab bar with the stage glyph in a progress ring, the live status
/// and the ETA. Status changes roll through it in place; tap it to bring the
/// full card back.
struct OrderStatusPill: View {
    let order: Order
    var tracking: DriverLiveTracking? = nil
    var onExpand: () -> Void
    var onDismiss: () -> Void

    static let height: CGFloat = 58

    private var stage: DeliveryStage { order.status.stage }
    private var itemCount: Int { order.items.reduce(0) { $0 + $1.qty } }
    private var etaMinutes: Int { tracking?.etaMinutes ?? order.etaMinutes ?? 8 }
    private var progress: Double { stage.progress(live: tracking?.progress) }

    private var accent: Color {
        switch stage {
        case .delivered: return .positive
        case .cancelled: return .danger
        default: return .brandOrange
        }
    }

    /// Same line as the full card, so collapsing never changes the story.
    private var subtitle: String {
        if stage == .onTheWay, let line = tracking?.statusText, !line.isEmpty {
            return line
        }
        return stage.subtitle(etaMinutes: etaMinutes, itemCount: itemCount)
    }

    var body: some View {
        HStack(spacing: 11) {
            ring

            VStack(alignment: .leading, spacing: 2) {
                Text(stage.headline(riderName: order.driverName))
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
            onExpand()
        }
        .animation(.dashitSpring, value: stage)
        .animation(.easeInOut(duration: 0.6), value: progress)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isButton)
        .accessibilityLabel("\(stage.headline(riderName: order.driverName)). \(subtitle)")
        .accessibilityHint("Shows the order tracker")
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

    /// Minutes to the door while live; a dismiss button once it's over.
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
