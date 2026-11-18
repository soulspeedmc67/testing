import SwiftUI
import UIKit

// MARK: - The home screen's pull-down flourish
//
// Pulling the home feed down past the top (people do it a lot) reveals the
// DASHit mark in the gap above the header: it grows in with the finger while
// its orange dash slides in from the left with two thin speed lines, as if
// dashing into place. At a full pull it gives a small spring "snap" and one
// light haptic tick. Pulling further draws the dash back into the D like a
// slingshot; letting go from there fires it out to the right with speed lines
// while the D kicks back (and a firmer tap), and it rides back up with the
// feed. Nothing is
// reloaded: the home feed is already live, so this is only the gesture's feel.
// Same drawing and timings as the Android app (HomePullDash.kt).

/// How far the feed has been pulled down, kept apart from the home view so
/// only the mark redraws while the finger moves (the feed itself doesn't).
@MainActor
final class HomePullState: ObservableObject {
    @Published private(set) var pull: CGFloat = 0
    /// When the dash was fired (let go from a full pull), and how far it was drawn back then.
    @Published private(set) var firedAt: Date?
    private(set) var chargeAtRelease: CGFloat = 0
    private var armed = false
    private var peak: CGFloat = 0
    private let tick = UIImpactFeedbackGenerator(style: .light)
    private let thump = UIImpactFeedbackGenerator(style: .rigid)

    /// 0...1 past the full pull: how far the dash is drawn back.
    var charge: CGFloat { max(0, min(1, (pull - HomePullDash.threshold) / HomePullDash.chargeSpan)) }

    /// `minY` is the header's top in the home scroll view: 0 at rest, more when pulled down.
    func headerTopChanged(_ minY: CGFloat) {
        let next = minY > 1.5 ? minY : 0
        guard abs(next - pull) >= 0.5 || (next == 0 && pull != 0) else { return }
        pull = next
        if next >= HomePullDash.threshold {
            if !armed {
                armed = true
                peak = next
                tick.impactOccurred()
                thump.prepare()
            }
            peak = max(peak, next)
        }
        // iOS 17 has no "finger lifted" signal here: once armed, the pull
        // shrinking is the release (the scroll view springing back).
        if armed, firedAt == nil, next < peak - 8 {
            chargeAtRelease = max(0, min(1, (peak - HomePullDash.threshold) / HomePullDash.chargeSpan))
            firedAt = .now
            thump.impactOccurred()
            Task { [weak self] in
                try? await Task.sleep(for: .seconds(HomePullDash.fireDuration + 0.05))
                self?.firedAt = nil
            }
        }
        if next < HomePullDash.threshold * 0.6 {
            armed = false
            peak = 0
            if next > 0 { tick.prepare() }
        }
    }
}

struct HomePullDash: View {
    /// Points of pull for the full mark (and the snap).
    static let threshold: CGFloat = 110
    /// Points of pull past the threshold that draw the dash all the way back.
    static let chargeSpan: CGFloat = 50
    /// Seconds the dash takes to fire off.
    static let fireDuration: Double = 0.26

    @ObservedObject var state: HomePullState
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        let firing = state.firedAt != nil
        // While it fires, the mark stays whole as the feed closes over it.
        let progress = firing ? 1 : min(1, state.pull / Self.threshold)
        let armed = !firing && state.pull >= Self.threshold
        TimelineView(.animation(paused: !firing)) { timeline in
            let fired: CGFloat = state.firedAt.map {
                let p = CGFloat(timeline.date.timeIntervalSince($0) / Self.fireDuration)
                // Ease in: slow off the mark, then gone.
                return max(0, min(1, p))
            } ?? 0
            DashMarkCanvas(
                progress: progress,
                charge: firing ? state.chargeAtRelease : state.charge,
                fired: fired,
                ink: colorScheme == .dark ? .white : Color(red: 0.024, green: 0.094, blue: 0.22)
            )
        }
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
/// so it is crisp at any size and the dash can move on its own. `progress` 0...1
/// slides the dash in; `charge` 0...1 draws it back like a slingshot; `fired`
/// 0...1 shoots it out to the right while the D recoils.
struct DashMarkCanvas: View {
    let progress: CGFloat
    var charge: CGFloat = 0
    var fired: CGFloat = 0
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
            let c = max(0, min(1, charge))
            let f = max(0, min(1, fired))
            let eased = 1 - pow(1 - t, 3)
            // The D kicks back to the left as the dash leaves, then settles.
            let recoil = -0.07 * sin(CGFloat.pi * min(1, f * 1.6))

            // The two blocks.
            context.fill(Path(roundedRect: box(0.15 + recoil, 0.09, 0.30, 0.21), cornerRadius: 0.05 * s), with: .color(ink))
            context.fill(Path(roundedRect: box(0.15 + recoil, 0.70, 0.33, 0.21), cornerRadius: 0.05 * s), with: .color(ink))

            // The D's bowl: the right half of a ring, traced point by point.
            var bowl = Path()
            let cx = ox + (0.50 + recoil) * s, cy = 0.50 * s, outer = 0.41 * s, inner = 0.20 * s
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

            // The dash: slides in from the left, a little stretched while it moves;
            // drawn back (and squashed) by the charge; then fired off to the
            // right, stretched long while it flies.
            let restWidth: CGFloat = 0.395
            let shot = pow(f, 1.5)
            let width = restWidth * (1 + (1 - eased) * 0.6) * (1 - 0.22 * c * (1 - f)) * (1 + 1.1 * sin(CGFloat.pi * f))
            let x = 0.085 - (1 - eased) * 0.9 - (width - restWidth) * (1 - f) - 0.13 * c * (1 - f) + shot * 1.9
            if f < 0.98 {
                context.fill(Path(roundedRect: box(x, 0.435, width, 0.13), cornerRadius: 0.065 * s), with: .color(Self.orange))
            }

            // Two speed lines behind it while it moves (sliding in or fired off).
            let streak = max(sin(CGFloat.pi * t), sin(CGFloat.pi * f) * 1.2) * 0.7
            if streak > 0.02 {
                context.fill(Path(roundedRect: box(x - 0.26, 0.405, 0.18, 0.045), cornerRadius: 0.0225 * s),
                             with: .color(Self.orange.opacity(Double(streak))))
                context.fill(Path(roundedRect: box(x - 0.20, 0.55, 0.12, 0.045), cornerRadius: 0.0225 * s),
                             with: .color(Self.orange.opacity(Double(streak * 0.7))))
            }
        }
    }
}
