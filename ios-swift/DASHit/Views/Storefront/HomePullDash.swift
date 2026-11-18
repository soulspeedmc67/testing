import SwiftUI
import UIKit

// MARK: - The home screen's pull-down flourish
//
// Pulling the home feed down past the top (people do it a lot) reveals the
// DASHit mark in the gap above the header: it grows in with the finger while
// its orange dash slides in from the left with two thin speed lines, as if
// dashing into place. At a full pull it gives a small spring "snap" and one
// light haptic tick; letting go, it rides back up with the feed. Nothing is
// reloaded: the home feed is already live, so this is only the gesture's feel.
// Same drawing and timings as the Android app (HomePullDash.kt).

/// How far the feed has been pulled down, kept apart from the home view so
/// only the mark redraws while the finger moves (the feed itself doesn't).
@MainActor
final class HomePullState: ObservableObject {
    @Published private(set) var pull: CGFloat = 0
    private var armed = false
    private let tick = UIImpactFeedbackGenerator(style: .light)

    /// `minY` is the header's top in the home scroll view: 0 at rest, more when pulled down.
    func headerTopChanged(_ minY: CGFloat) {
        let next = minY > 1.5 ? minY : 0
        guard abs(next - pull) >= 0.5 || (next == 0 && pull != 0) else { return }
        pull = next
        if next >= HomePullDash.threshold {
            if !armed {
                armed = true
                tick.impactOccurred()
            }
        } else if next < HomePullDash.threshold * 0.6 {
            armed = false
            if next > 0 { tick.prepare() }
        }
    }
}

struct HomePullDash: View {
    /// Points of pull for the full mark (and the snap).
    static let threshold: CGFloat = 110

    @ObservedObject var state: HomePullState
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        let progress = min(1, state.pull / Self.threshold)
        let armed = state.pull >= Self.threshold
        DashMarkCanvas(
            progress: progress,
            ink: colorScheme == .dark ? .white : Color(red: 0.024, green: 0.094, blue: 0.22)
        )
        .frame(width: 101, height: 46)
        .scaleEffect((0.6 + 0.4 * progress) * (armed ? 1.08 : 1))
        .animation(.spring(response: 0.28, dampingFraction: 0.5), value: armed)
        .opacity(Double(min(1, progress * 1.4)))
        .frame(maxWidth: .infinity)
        .frame(height: max(46, state.pull))
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

/// The DASHit mark (two blocks, the D's bowl, the orange dash) drawn as shapes,
/// so it is crisp at any size and the dash can move on its own. `progress` 0...1.
struct DashMarkCanvas: View {
    let progress: CGFloat
    let ink: Color

    private static let orange = Color(red: 1.0, green: 0.357, blue: 0.0)

    var body: some View {
        Canvas { context, size in
            let s = min(size.height, size.width)          // the mark's square
            let ox = (size.width - s) / 2                  // room on the left for the dash to come from
            func box(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) -> CGRect {
                CGRect(x: ox + x * s, y: y * s, width: w * s, height: h * s)
            }
            let t = max(0, min(1, progress))
            let eased = 1 - pow(1 - t, 3)

            // The two blocks.
            context.fill(Path(roundedRect: box(0.15, 0.09, 0.30, 0.21), cornerRadius: 0.05 * s), with: .color(ink))
            context.fill(Path(roundedRect: box(0.15, 0.70, 0.33, 0.21), cornerRadius: 0.05 * s), with: .color(ink))

            // The D's bowl: the right half of a ring, traced point by point.
            var bowl = Path()
            let cx = ox + 0.50 * s, cy = 0.50 * s, outer = 0.41 * s, inner = 0.20 * s
            let steps = 28
            for i in 0...steps {
                let a = -CGFloat.pi / 2 + CGFloat.pi * CGFloat(i) / CGFloat(steps)
                let p = CGPoint(x: cx + outer * cos(a), y: cy + outer * sin(a))
                if i == 0 { bowl.move(to: p) } else { bowl.addLine(to: p) }
            }
            for i in stride(from: steps, through: 0, by: -1) {
                let a = -CGFloat.pi / 2 + CGFloat.pi * CGFloat(i) / CGFloat(steps)
                bowl.addLine(to: CGPoint(x: cx + inner * cos(a), y: cy + inner * sin(a)))
            }
            bowl.closeSubpath()
            context.fill(bowl, with: .color(ink))

            // The dash: slides in from the left, a little stretched while it moves.
            let restWidth: CGFloat = 0.395
            let width = restWidth * (1 + (1 - eased) * 0.6)
            let x = 0.085 - (1 - eased) * 0.9 - (width - restWidth)
            context.fill(Path(roundedRect: box(x, 0.435, width, 0.13), cornerRadius: 0.065 * s), with: .color(Self.orange))

            // Two speed lines behind it while it moves.
            let streak = sin(CGFloat.pi * t) * 0.7
            if streak > 0.02 {
                context.fill(Path(roundedRect: box(x - 0.26, 0.405, 0.18, 0.045), cornerRadius: 0.0225 * s),
                             with: .color(Self.orange.opacity(Double(streak))))
                context.fill(Path(roundedRect: box(x - 0.20, 0.55, 0.12, 0.045), cornerRadius: 0.0225 * s),
                             with: .color(Self.orange.opacity(Double(streak * 0.7))))
            }
        }
    }
}
