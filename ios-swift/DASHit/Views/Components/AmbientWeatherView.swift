import SwiftUI

/// A faint snowfall or rain inside the home header's glow while the admin has
/// the weather advisory on (`weatherAlert` on `config/store`, type "snow" or
/// "rain"). Nothing new to switch: the same control that shows "Orders may be
/// delayed" drives this, and the web and Android apps follow the same field.
///
/// It fills whatever space it is given (the header backdrop), fades out toward
/// the bottom with the gradient, never takes a touch, stays still for people
/// who turn on Reduce Motion, and is paused by the system whenever the app
/// isn't on screen.
struct AmbientWeatherView: View {
    @ObservedObject private var store = StoreStatusStore.shared
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.colorScheme) private var colorScheme

    private enum Kind { case snow, rain }

    private var kind: Kind? {
        switch store.delayNotice?.type {
        case "snow": return .snow
        case "rain": return .rain
        default: return nil
        }
    }

    var body: some View {
        ZStack {
            if let kind, !reduceMotion {
                TimelineView(.animation) { timeline in
                    Canvas(rendersAsynchronously: true) { context, size in
                        let t = timeline.date.timeIntervalSinceReferenceDate
                        switch kind {
                        case .snow: drawSnow(&context, size: size, time: t)
                        case .rain: drawRain(&context, size: size, time: t)
                        }
                    }
                }
                .mask(
                    LinearGradient(
                        stops: [.init(color: .black, location: 0), .init(color: .black, location: 0.45),
                                .init(color: .clear, location: 1)],
                        startPoint: .top, endPoint: .bottom
                    )
                )
                .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 1.6), value: kind == nil ? 0 : (kind == .snow ? 1 : 2))
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    // MARK: - Particles

    /// The same number every time for the same `i` and `salt`, so there is no
    /// state to keep: where a particle is depends only on the clock.
    private func rnd(_ i: Int, _ salt: Int) -> Double {
        let x = sin(Double(i &* 127 &+ salt &* 311)) * 43758.5453
        return x - floor(x)
    }

    /// 0 far (tiny, slow, faint) to 1 near (bigger, quicker, clearer). Skewed
    /// toward far, so there are plenty of fine specks and a few near ones: that
    /// is what makes the fall look deep instead of flat.
    private func depth(_ i: Int) -> Double { pow(rnd(i, 1), 1.5) }

    private func count(for size: CGSize, perPoints: Double, max limit: Int) -> Int {
        let n = Int((Double(size.width) * Double(size.height)) / perPoints)
        return min(limit, max(30, n))
    }

    private func drawSnow(_ context: inout GraphicsContext, size: CGSize, time t: Double) {
        let n = count(for: size, perPoints: 1500, max: 110)
        let w = Double(size.width), h = Double(size.height)
        let travelY = h + 20
        let travelX = w + 40
        // A slow, shifting breeze, worked out as a distance so every flake is
        // carried the same way, near ones further than far ones.
        let drift = -(7 / 0.23) * cos(0.23 * t) - (3 / 0.71) * cos(0.71 * t + 1.3)
        for i in 0..<n {
            let d = depth(i)
            let radius = 0.6 + d * 2.2
            let speed = 12 + d * 34
            let sway = 3 + rnd(i, 2) * 9
            let swaySpeed = 0.4 + rnd(i, 6) * 0.7
            let phase = rnd(i, 3) * .pi * 2
            let alpha = 0.3 + d * 0.45

            let y = (rnd(i, 4) * travelY + speed * t).truncatingRemainder(dividingBy: travelY) - 10
            var x = rnd(i, 5) * travelX + drift * (0.35 + d) + sin(t * swaySpeed + phase) * sway
            x = x.truncatingRemainder(dividingBy: travelX)
            if x < 0 { x += travelX }
            x -= 20

            // A soft cool-grey edge with a white core: pure white would vanish on
            // the light peach header. At night the header is dark, so white alone.
            let halo = radius * (d > 0.7 ? 2.6 : 2.0)
            let haloRect = CGRect(x: x - halo, y: y - halo, width: halo * 2, height: halo * 2)
            let coreRect = CGRect(x: x - radius * 0.7, y: y - radius * 0.7, width: radius * 1.4, height: radius * 1.4)
            let edge = colorScheme == .dark ? Color.white : Color(red: 104 / 255, green: 132 / 255, blue: 178 / 255)
            context.fill(Path(ellipseIn: haloRect), with: .radialGradient(
                Gradient(stops: [.init(color: edge.opacity(alpha * 0.62), location: 0),
                                 .init(color: edge.opacity(alpha * 0.42), location: 0.5),
                                 .init(color: edge.opacity(0), location: 1)]),
                center: CGPoint(x: x, y: y), startRadius: 0, endRadius: halo))
            context.fill(Path(ellipseIn: coreRect), with: .color(.white.opacity(min(1, alpha * 1.25))))
        }
    }

    private func drawRain(_ context: inout GraphicsContext, size: CGSize, time t: Double) {
        let ink = colorScheme == .dark ? Color(red: 174 / 255, green: 198 / 255, blue: 230 / 255)
                                       : Color(red: 84 / 255, green: 108 / 255, blue: 152 / 255)
        let n = count(for: size, perPoints: 1800, max: 100)
        let slant = 0.2                          // a gentle lean, not a storm
        let travelY = Double(size.height) + 60
        let travelX = Double(size.width) + 60
        for i in 0..<n {
            let d = depth(i)
            let length = 8 + d * 18
            let speed = 380 + d * 520
            let alpha = 0.24 + d * 0.44
            let width = 0.6 + d * 0.9

            let y = (rnd(i, 12) * travelY + speed * t).truncatingRemainder(dividingBy: travelY) - 30
            let x = (rnd(i, 13) * travelX + speed * slant * t).truncatingRemainder(dividingBy: travelX) - 30

            let tail = CGPoint(x: x - length * slant, y: y - length)
            let head = CGPoint(x: x, y: y)
            var path = Path()
            path.move(to: tail)
            path.addLine(to: head)
            // Faint tail, brighter head: reads as motion blur, not a hard line.
            context.stroke(
                path,
                with: .linearGradient(
                    Gradient(colors: [ink.opacity(0), ink.opacity(alpha)]),
                    startPoint: tail, endPoint: head
                ),
                style: StrokeStyle(lineWidth: width, lineCap: .round)
            )
        }
    }
}
