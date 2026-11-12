import SwiftUI

/// A faint snowfall or rain over the shop while the admin has the weather
/// advisory on (`weatherAlert` on `config/store`, type "snow" or "rain").
/// Nothing new to switch: the same control that shows "Orders may be delayed"
/// drives this, and the web and Android apps follow the same field.
///
/// Kept deliberately quiet: a few dozen soft particles at low opacity, never
/// taking a touch, still for people who turn on Reduce Motion, and paused by
/// the system whenever the app isn't on screen.
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
                .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 1.6), value: kind == nil ? 0 : (kind == .snow ? 1 : 2))
        .ignoresSafeArea()
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

    private func count(for size: CGSize, perPoints: Double, max limit: Int) -> Int {
        let n = Int((Double(size.width) * Double(size.height)) / perPoints)
        return min(limit, max(24, n))
    }

    private func drawSnow(_ context: inout GraphicsContext, size: CGSize, time t: Double) {
        let ink = colorScheme == .dark ? Color.white : Color(red: 120 / 255, green: 146 / 255, blue: 184 / 255)
        let n = count(for: size, perPoints: 16000, max: 70)
        let travel = Double(size.height) + 20
        for i in 0..<n {
            let depth = rnd(i, 1)               // 0 far and faint, 1 near and clearer
            let radius = 0.8 + depth * 2.1
            let speed = 14 + depth * 26
            let sway = 6 + rnd(i, 2) * 12
            let phase = rnd(i, 3) * .pi * 2
            let alpha = 0.22 + depth * 0.4

            let y = (rnd(i, 4) * travel + speed * t).truncatingRemainder(dividingBy: travel) - 10
            let x = rnd(i, 5) * Double(size.width) + sin(t * 0.6 + phase) * sway

            let halo = CGRect(x: x - radius * 2, y: y - radius * 2, width: radius * 4, height: radius * 4)
            let core = CGRect(x: x - radius, y: y - radius, width: radius * 2, height: radius * 2)
            context.fill(Path(ellipseIn: halo), with: .color(ink.opacity(alpha * 0.28)))
            context.fill(Path(ellipseIn: core), with: .color(ink.opacity(alpha)))
        }
    }

    private func drawRain(_ context: inout GraphicsContext, size: CGSize, time t: Double) {
        let ink = colorScheme == .dark ? Color(red: 174 / 255, green: 198 / 255, blue: 230 / 255)
                                       : Color(red: 96 / 255, green: 122 / 255, blue: 160 / 255)
        let n = count(for: size, perPoints: 22000, max: 55)
        let slant = 0.2                          // a gentle lean, not a storm
        let travelY = Double(size.height) + 60
        let travelX = Double(size.width) + 80
        for i in 0..<n {
            let depth = rnd(i, 11)
            let length = 9 + depth * 14
            let speed = 520 + depth * 380
            let alpha = 0.1 + depth * 0.16
            let width = 0.6 + depth * 0.5

            let y = (rnd(i, 12) * travelY + speed * t).truncatingRemainder(dividingBy: travelY) - 30
            let x = (rnd(i, 13) * travelX + speed * slant * t).truncatingRemainder(dividingBy: travelX) - 40

            var path = Path()
            path.move(to: CGPoint(x: x, y: y))
            path.addLine(to: CGPoint(x: x - length * slant, y: y - length))
            context.stroke(path, with: .color(ink.opacity(alpha)),
                           style: StrokeStyle(lineWidth: width, lineCap: .round))
        }
    }
}
