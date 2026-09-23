import SwiftUI

/// The stage rail from the web tracker: a dashed track, a solid fill up to the
/// current stage, a marker riding the end of the fill and a home pin at the end.
/// Compiled into both targets, so the in-app tracker, the tracking screen and the
/// Live Activity all draw the same thing. Designed for a dark surface.
public struct OrderProgressRail: View {
    public let stage: DeliveryStage
    /// 0–1; defaults to the stage's floor. Pass the live value while riding.
    public let progress: Double?
    public let markerSize: CGFloat

    public init(stage: DeliveryStage, progress: Double? = nil, markerSize: CGFloat = 26) {
        self.stage = stage
        self.progress = progress
        self.markerSize = markerSize
    }

    private static let midnight = Color(red: 6 / 255, green: 24 / 255, blue: 56 / 255)
    private static let success = Color(red: 34 / 255, green: 197 / 255, blue: 94 / 255)

    public var body: some View {
        HStack(spacing: 8) {
            GeometryReader { geo in
                let width = geo.size.width
                let fill = width * CGFloat(progress ?? stage.progress)
                let midY = geo.size.height / 2

                ZStack(alignment: .leading) {
                    if stage == .delivered {
                        Capsule()
                            .fill(Self.success)
                            .frame(height: 4)
                    } else {
                        Path { path in
                            path.move(to: CGPoint(x: 0, y: midY))
                            path.addLine(to: CGPoint(x: width, y: midY))
                        }
                        .stroke(
                            Color.white.opacity(0.3),
                            style: StrokeStyle(lineWidth: 2.5, lineCap: .round, dash: [5, 5])
                        )

                        Capsule()
                            .fill(Color.white)
                            .frame(width: max(fill, 0), height: 3.5)

                        marker
                            .offset(x: min(max(fill - markerSize / 2, 0), max(width - markerSize, 0)))
                    }
                }
                .frame(width: width, height: geo.size.height)
            }
            .frame(height: markerSize)

            endMarker
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text(stage.headline(riderName: nil)))
    }

    private var marker: some View {
        Circle()
            .fill(Color.white)
            .frame(width: markerSize, height: markerSize)
            .overlay(
                Image(systemName: stage.symbol)
                    .font(.system(size: markerSize * 0.46, weight: .bold))
                    .foregroundColor(Self.midnight)
            )
            .shadow(color: Color.black.opacity(0.25), radius: 3, x: 0, y: 1)
    }

    private var endMarker: some View {
        let delivered = stage == .delivered
        return Circle()
            .fill(delivered ? Self.success : Color.white)
            .frame(width: markerSize, height: markerSize)
            .overlay(
                Image(systemName: delivered ? "checkmark" : "house.fill")
                    .font(.system(size: markerSize * 0.46, weight: .bold))
                    .foregroundColor(delivered ? Color.white : Self.midnight)
            )
    }
}
