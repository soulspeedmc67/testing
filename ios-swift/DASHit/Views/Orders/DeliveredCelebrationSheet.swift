import SwiftUI

/// "Order delivered", shown once per order when the shopper is next in the app:
/// a green badge springs in, the check draws itself, a ring pulses out and a
/// short confetti burst falls behind it, then the order's summary.
struct DeliveredCelebrationSheet: View {
    let order: Order
    var onReorder: () -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var badgeShown = false
    @State private var checkProgress: CGFloat = 0
    @State private var ringExpanded = false
    @State private var contentShown = false
    @State private var confettiStart: Date?

    private var units: Int { order.items.reduce(0) { $0 + $1.qty } }

    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                if let confettiStart {
                    ConfettiBurst(start: confettiStart)
                        .allowsHitTesting(false)
                }
                emblem
            }
            .frame(height: 190)

            VStack(spacing: 6) {
                Text("Order delivered")
                    .font(.system(size: 26, weight: .heavy))
                    .foregroundColor(.textPrimary)
                Text("Your groceries have arrived. Enjoy!")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(.textSecondary)
            }
            .multilineTextAlignment(.center)
            .opacity(contentShown ? 1 : 0)
            .offset(y: contentShown ? 0 : 10)

            summary
                .padding(.top, 22)
                .opacity(contentShown ? 1 : 0)
                .offset(y: contentShown ? 0 : 14)

            Spacer(minLength: 16)

            VStack(spacing: 6) {
                Button {
                    HapticsManager.shared.light()
                    dismiss()
                } label: {
                    Text("Done")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(Color.brandOrange, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .buttonStyle(.pressable)

                Button {
                    HapticsManager.shared.success()
                    onReorder()
                    dismiss()
                } label: {
                    Text("Order these again")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.brandAccent)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                }
                .buttonStyle(.pressable)
            }
            .opacity(contentShown ? 1 : 0)
        }
        .padding(.horizontal, 20)
        .padding(.top, 8)
        .padding(.bottom, 12)
        .background(Color.surface.ignoresSafeArea())
        .presentationDetents([.height(590)])
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(28)
        .presentationBackground(Color.surface)
        .onAppear(perform: celebrate)
        .accessibilityElement(children: .contain)
    }

    // MARK: - Pieces

    private var emblem: some View {
        ZStack {
            Circle()
                .strokeBorder(Color.positive.opacity(0.45), lineWidth: 2)
                .frame(width: 96, height: 96)
                .scaleEffect(ringExpanded ? 1.9 : 0.8)
                .opacity(ringExpanded ? 0 : 1)
            Circle()
                .fill(Color.positive)
                .frame(width: 88, height: 88)
                .shadow(color: Color.positive.opacity(0.35), radius: 18, x: 0, y: 8)
                .scaleEffect(badgeShown ? 1 : 0.3)
                .opacity(badgeShown ? 1 : 0)
            CheckmarkShape()
                .trim(from: 0, to: checkProgress)
                .stroke(Color.white, style: StrokeStyle(lineWidth: 7, lineCap: .round, lineJoin: .round))
                .frame(width: 38, height: 28)
        }
        .accessibilityHidden(true)
    }

    private var summary: some View {
        HStack(spacing: 12) {
            HStack(spacing: -10) {
                ForEach(Array(order.items.prefix(4).enumerated()), id: \.offset) { _, item in
                    AsyncImage(url: URL(string: item.img)) { phase in
                        if let image = phase.image {
                            image.resizable().scaledToFill()
                        } else if phase.error == nil && !item.img.isEmpty {
                            ShimmerView()
                        } else {
                            Color.surfaceMuted
                        }
                    }
                    .frame(width: 40, height: 40)
                    .clipShape(Circle())
                    .overlay(Circle().strokeBorder(Color.surfaceRaised, lineWidth: 2))
                }
            }
            VStack(alignment: .leading, spacing: 2) {
                Text("\(units) item\(units == 1 ? "" : "s") · \(CurrencyFormatter.format(order.grandTotal))")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.textPrimary)
                Text("Order #\(order.id.suffix(6))")
                    .font(.system(size: 12, weight: .medium, design: .monospaced))
                    .foregroundColor(.textMuted)
            }
            Spacer(minLength: 0)
        }
        .padding(14)
        .dashitCard(cornerRadius: 18)
    }

    // MARK: - Motion

    private func celebrate() {
        HapticsManager.shared.success()
        guard !reduceMotion else {
            badgeShown = true
            checkProgress = 1
            contentShown = true
            return
        }
        withAnimation(.spring(response: 0.45, dampingFraction: 0.62)) {
            badgeShown = true
        }
        withAnimation(.timingCurve(0.22, 1, 0.36, 1, duration: 0.4).delay(0.18)) {
            checkProgress = 1
        }
        withAnimation(.easeOut(duration: 0.9).delay(0.2)) {
            ringExpanded = true
        }
        withAnimation(.timingCurve(0.22, 1, 0.36, 1, duration: 0.45).delay(0.32)) {
            contentShown = true
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.22) {
            confettiStart = Date()
        }
    }
}

/// A tick drawn as one stroke, so it can be traced in with `trim`.
private struct CheckmarkShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.minX, y: rect.minY + rect.height * 0.55))
        path.addLine(to: CGPoint(x: rect.minX + rect.width * 0.36, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        return path
    }
}

/// A short, restrained burst of confetti in the brand's colours: pieces fly out
/// from the badge, tumble and fall away within about two seconds.
private struct ConfettiBurst: View {
    let start: Date

    private struct Piece {
        let angle: Double
        let speed: Double
        let spin: Double
        let size: CGSize
        let color: Color
    }

    private static let duration: Double = 2.2
    private static let palette: [Color] = [
        .brandOrange, .positive, .white, Color(red: 1, green: 0.73, blue: 0.45), Color(red: 1, green: 0.84, blue: 0.4)
    ]

    @State private var pieces: [Piece] = (0..<46).map { index in
        Piece(
            angle: Double.random(in: -Double.pi * 0.95 ... -Double.pi * 0.05),
            speed: Double.random(in: 240...430),
            spin: Double.random(in: -9...9),
            size: index % 3 == 0 ? CGSize(width: 6, height: 6) : CGSize(width: 4, height: 9),
            color: ConfettiBurst.palette[index % ConfettiBurst.palette.count]
        )
    }

    var body: some View {
        TimelineView(.animation) { context in
            Canvas { canvas, size in
                let t = context.date.timeIntervalSince(start)
                guard t >= 0, t < Self.duration else { return }
                let origin = CGPoint(x: size.width / 2, y: size.height / 2)
                let fade = max(0, 1 - t / Self.duration)
                for piece in pieces {
                    // Launch, gravity and a little air drag.
                    let drag = 1 - min(0.6, t * 0.35)
                    let x = origin.x + cos(piece.angle) * piece.speed * t * drag
                    let y = origin.y + sin(piece.angle) * piece.speed * t * drag + 0.5 * 620 * t * t
                    var copy = canvas
                    copy.opacity = fade
                    copy.translateBy(x: x, y: y)
                    copy.rotate(by: .radians(piece.spin * t))
                    let rect = CGRect(x: -piece.size.width / 2, y: -piece.size.height / 2, width: piece.size.width, height: piece.size.height)
                    copy.fill(Path(roundedRect: rect, cornerRadius: 1.5), with: .color(piece.color))
                }
            }
        }
    }
}
