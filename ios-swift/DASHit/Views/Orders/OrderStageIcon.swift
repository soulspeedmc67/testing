import SwiftUI

/// The line-art icon at the top of the "Order received" and "Packing" screens.
///
/// Received: a receipt fills in line by line, then an orange tick lands on it.
/// Packing: two items drop into a box, the flaps fold shut and it's taped.
///
/// Drawn in a 120×120 box and worked out from `time` alone, so a looping
/// timeline drives it without restarts, and the Android app draws the same
/// frames from the same numbers (`OrderStageIcon.kt`).
struct OrderStageIcon: View {
    enum Kind {
        case received
        case packing
    }

    let kind: Kind
    /// Seconds since the screen opened.
    let time: Double
    /// The colour behind the icon; shapes that pass behind others are filled with it.
    var background: Color = .midnight

    static let receivedPeriod = 3.2
    static let packingPeriod = 3.6
    /// A frame with everything in place, for Reduce Motion.
    static let restingTime = 2.4

    private let ink = Color.white.opacity(0.92)
    private let accent = Color.brandOrange
    private let line = StrokeStyle(lineWidth: 4, lineCap: .round, lineJoin: .round)

    var body: some View {
        Canvas { context, size in
            let scale = min(size.width, size.height) / 120
            var ctx = context
            ctx.translateBy(x: (size.width - 120 * scale) / 2, y: (size.height - 120 * scale) / 2)
            ctx.scaleBy(x: scale, y: scale)

            ctx.fill(Path(ellipseIn: CGRect(x: 4, y: 4, width: 112, height: 112)), with: .color(.white.opacity(0.06)))
            switch kind {
            case .received: drawReceived(ctx)
            case .packing: drawPacking(ctx)
            }
        }
    }

    // MARK: - Received

    private func drawReceived(_ ctx: GraphicsContext) {
        let t = time.truncatingRemainder(dividingBy: Self.receivedPeriod)
        let fade = 1 - Ease.segment(t, 2.7, 3.1)

        var receipt = Path()
        receipt.move(to: CGPoint(x: 36, y: 24))
        receipt.addQuadCurve(to: CGPoint(x: 42, y: 18), control: CGPoint(x: 36, y: 18))
        receipt.addLine(to: CGPoint(x: 78, y: 18))
        receipt.addQuadCurve(to: CGPoint(x: 84, y: 24), control: CGPoint(x: 84, y: 18))
        for (x, y) in [(84.0, 100.0), (77, 95), (70, 100), (63, 95), (56, 100), (49, 95), (42, 100), (36, 95)] {
            receipt.addLine(to: CGPoint(x: x, y: y))
        }
        receipt.closeSubpath()
        ctx.fill(receipt, with: .color(background))
        ctx.stroke(receipt, with: .color(ink), style: line)

        // The order's lines, written one after another.
        var lines = ctx
        lines.opacity = fade * 0.8
        for (index, row) in [(46.0, 38.0, 74.0), (46, 50, 70), (46, 62, 62)].enumerated() {
            let progress = Ease.out(Ease.segment(t, 0.15 + Double(index) * 0.28, 0.55 + Double(index) * 0.28))
            guard progress > 0.001 else { continue }
            var path = Path()
            path.move(to: CGPoint(x: row.0, y: row.1))
            path.addLine(to: CGPoint(x: row.2, y: row.1))
            lines.stroke(path.trimmedPath(from: 0, to: progress), with: .color(ink), style: line)
        }

        // The tick: the badge pops in, then the tick draws itself.
        let pop = Ease.outBack(Ease.segment(t, 1.05, 1.45))
        guard pop > 0.001 else { return }
        var badge = ctx
        badge.opacity = fade
        badge.translateBy(x: 80, y: 90)
        badge.scaleBy(x: pop, y: pop)
        badge.translateBy(x: -80, y: -90)
        badge.fill(Path(ellipseIn: CGRect(x: 65, y: 75, width: 30, height: 30)), with: .color(accent))
        let tick = Ease.out(Ease.segment(t, 1.35, 1.75))
        if tick > 0.001 {
            var path = Path()
            path.move(to: CGPoint(x: 72, y: 90))
            path.addLine(to: CGPoint(x: 77.5, y: 95.5))
            path.addLine(to: CGPoint(x: 88, y: 85))
            badge.stroke(path.trimmedPath(from: 0, to: tick), with: .color(.white), style: line)
        }
    }

    // MARK: - Packing

    private func drawPacking(_ ctx: GraphicsContext) {
        let t = time.truncatingRemainder(dividingBy: Self.packingPeriod)

        // Items fall in and disappear behind the front of the box.
        let gone = Ease.segment(t, 2.8, 3.2)
        let items: [(x: Double, w: Double, h: Double, filled: Bool, start: Double)] = [
            (43, 16, 16, true, 0.1),
            (62, 14, 19, false, 0.6)
        ]
        for item in items {
            let fall = Ease.segment(t, item.start, item.start + 0.75)
            guard fall > 0 else { continue }
            var itemCtx = ctx
            itemCtx.opacity = min(1, fall / 0.15) * (1 - gone)
            let y = 4 + (74 - 4) * fall * fall
            let shape = Path(roundedRect: CGRect(x: item.x, y: y, width: item.w, height: item.h), cornerRadius: 4)
            if item.filled {
                itemCtx.fill(shape, with: .color(accent))
            } else {
                itemCtx.fill(shape, with: .color(background))
                itemCtx.stroke(shape, with: .color(ink), style: StrokeStyle(lineWidth: 3.5, lineJoin: .round))
            }
        }

        // Shut, then open again for the next round; a small hop once taped.
        let shut = Ease.inOut(Ease.segment(t, 1.5, 1.95)) * (1 - Ease.inOut(Ease.segment(t, 2.95, 3.4)))
        let hop = sin(.pi * Ease.segment(t, 1.95, 2.3))
        var box = ctx
        box.translateBy(x: 0, y: -4 * hop)

        var front = Path()
        front.move(to: CGPoint(x: 28, y: 56))
        front.addLine(to: CGPoint(x: 92, y: 56))
        front.addLine(to: CGPoint(x: 92, y: 96))
        front.addQuadCurve(to: CGPoint(x: 86, y: 102), control: CGPoint(x: 92, y: 102))
        front.addLine(to: CGPoint(x: 34, y: 102))
        front.addQuadCurve(to: CGPoint(x: 28, y: 96), control: CGPoint(x: 28, y: 102))
        front.closeSubpath()
        box.fill(front, with: .color(background))
        box.stroke(front, with: .color(ink), style: line)

        // Flaps lean out when open and meet in the middle when shut.
        let angle = (1 - shut) * 118 * .pi / 180
        let length = 26.0
        var flaps = Path()
        flaps.move(to: CGPoint(x: 28, y: 56))
        flaps.addLine(to: CGPoint(x: 28 + length * cos(angle), y: 56 - length * sin(angle)))
        flaps.move(to: CGPoint(x: 92, y: 56))
        flaps.addLine(to: CGPoint(x: 92 - length * cos(angle), y: 56 - length * sin(angle)))
        box.stroke(flaps, with: .color(ink), style: line)

        let tape = Ease.out(Ease.segment(t, 1.95, 2.35))
        if tape > 0.001 {
            var tapeCtx = box
            tapeCtx.opacity = 1 - Ease.segment(t, 2.8, 2.95)
            var path = Path()
            path.move(to: CGPoint(x: 50, y: 56))
            path.addLine(to: CGPoint(x: 70, y: 56))
            tapeCtx.stroke(path.trimmedPath(from: 0, to: tape), with: .color(accent), style: StrokeStyle(lineWidth: 5, lineCap: .round))
        }
    }
}

/// Easing on a 0…1 progress value.
enum Ease {
    /// How far `t` is between `start` and `end`, held at 0 before and 1 after.
    static func segment(_ t: Double, _ start: Double, _ end: Double) -> Double {
        min(1, max(0, (t - start) / (end - start)))
    }

    static func out(_ x: Double) -> Double { 1 - pow(1 - x, 3) }

    static func inOut(_ x: Double) -> Double {
        x < 0.5 ? 4 * x * x * x : 1 - pow(-2 * x + 2, 3) / 2
    }

    /// Overshoots a little before settling, for things that pop in.
    static func outBack(_ x: Double) -> Double {
        let c1 = 1.70158
        let c3 = c1 + 1
        return 1 + c3 * pow(x - 1, 3) + c1 * pow(x - 1, 2)
    }
}
