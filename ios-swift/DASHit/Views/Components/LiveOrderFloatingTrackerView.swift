import SwiftUI

/// Top-docked live order card, matching the web LiveOrderFloatingTracker
/// (Zomato-style live-activity banner). Tap to open live tracking; swipe up or
/// tap × to tuck it into the corner button, or to dismiss a finished order.
struct LiveOrderFloatingTrackerView: View {
    let order: Order
    var onOpen: () -> Void
    var onClose: () -> Void

    @State private var dragOffset: CGFloat = 0

    private var stage: DeliveryStage { order.status.stage }
    private var itemCount: Int { order.items.reduce(0) { $0 + $1.qty } }
    private var cardShape: RoundedRectangle { RoundedRectangle(cornerRadius: 26, style: .continuous) }

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
                Text(stage.subtitle(etaMinutes: order.etaMinutes ?? 8, itemCount: itemCount))
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.textSecondary)
                    .lineLimit(1)
            }
            .padding(.top, 3)

            OrderProgressRail(stage: stage)
                .padding(.top, 14)
        }
        .padding(.horizontal, 18)
        .padding(.top, 12)
        .padding(.bottom, 18)
        .background(Color.trackerCard, in: cardShape)
        .overlay(cardShape.strokeBorder(Color.white.opacity(0.1), lineWidth: 1))
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

/// The tracker tucked away: stage glyph inside a progress ring, docked above
/// the tab bar on the trailing side.
struct CollapsedOrderTrackerButton: View {
    let order: Order
    var onExpand: () -> Void

    var body: some View {
        let stage = order.status.stage

        Button {
            HapticsManager.shared.light()
            onExpand()
        } label: {
            ZStack {
                Circle()
                    .fill(Color.trackerCard)
                Circle()
                    .stroke(Color.white.opacity(0.12), lineWidth: 3)
                    .padding(5)
                Circle()
                    .trim(from: 0, to: CGFloat(stage.progress))
                    .stroke(
                        stage == .delivered ? Color.positive : Color.brandOrange,
                        style: StrokeStyle(lineWidth: 3, lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))
                    .padding(5)
                Image(systemName: stage.symbol)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)
            }
            .frame(width: 56, height: 56)
            .overlay(Circle().strokeBorder(Color.white.opacity(0.1), lineWidth: 1))
            .shadow(color: Color.black.opacity(0.45), radius: 14, x: 0, y: 8)
        }
        .buttonStyle(PressableButtonStyle(scale: 0.9))
        .accessibilityLabel("\(stage.headline(riderName: order.driverName)). Show order tracker.")
    }
}
