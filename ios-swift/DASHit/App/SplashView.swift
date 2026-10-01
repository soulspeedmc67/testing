import SwiftUI

/// Takes over from the plain midnight launch screen and hands over to the app.
/// The logo builds itself, its four shapes flying in and snapping together,
/// then shrinks and tucks to the left while the letters of "dashit" pop in
/// from its side one after another, each sliding and settling, in a gentle
/// wave. The lockup then lifts away and the backdrop clears onto the app. No
/// blur anywhere: it is the costly kind of effect and stuttered while the
/// catalogue loaded underneath. Same timings and curves as the Android
/// `SplashOverlay`.
struct SplashView: View {
    /// Called once the logo has built itself: the app can start drawing
    /// underneath now without competing with the opening animation.
    var onLogoBuilt: () -> Void = {}
    /// Called as the backdrop starts to clear, so the app can settle into place.
    var onReveal: () -> Void
    /// Called once nothing of the splash is left on screen.
    var onFinish: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    // 1. Reveal
    @State private var pieceMoved = Array(repeating: false, count: 4)
    @State private var pieceVisible = Array(repeating: false, count: 4)
    @State private var logoRevealScale: CGFloat = 0.9
    // 2. Tuck, then the letters' wave
    @State private var isTucked = false
    @State private var letterSettled = Array(repeating: false, count: 6)
    @State private var letterVisible = Array(repeating: false, count: 6)
    // 3. Exit
    @State private var lockupScale: CGFloat = 1
    @State private var lockupOpacity: Double = 1
    @State private var backdropOpacity: Double = 1

    // Lockup geometry, in points around the screen centre.
    private static let logoSize: CGFloat = 114.67
    private static let tuckedLogoX: CGFloat = -82.35
    private static let tuckedLogoScale: CGFloat = 0.5
    private static let wordSize = CGSize(width: 158, height: 34)
    private static let wordX: CGFloat = 29.3
    /// The logo's four shapes (each the full logo-sized image, so they line up
    /// where they are drawn), where each flies in from, and when (seconds).
    private static let logoPieces: [(image: String, from: CGSize, delay: Double)] = [
        ("SplashLogoTop", CGSize(width: 0, height: -34), 0),
        ("SplashLogoBottom", CGSize(width: 0, height: 34), 0.06),
        ("SplashLogoArc", CGSize(width: 40, height: 0), 0.14),
        ("SplashLogoBar", CGSize(width: -72, height: 0), 0.22)
    ]
    /// Where each letter of the wordmark image starts, as a fraction of its
    /// width (d, a, s, h, i, t), cut in the gaps between the letters.
    private static let letterCuts: [CGFloat] = [0, 0.1862, 0.3936, 0.5727, 0.7713, 0.8652, 1]

    private static func easeOut(_ duration: Double) -> Animation { .timingCurve(0.22, 1, 0.36, 1, duration: duration) }
    private static func easeIn(_ duration: Double) -> Animation { .timingCurve(0.55, 0, 1, 0.45, duration: duration) }
    private static func easeInOut(_ duration: Double) -> Animation { .timingCurve(0.65, 0, 0.35, 1, duration: duration) }
    /// A settle with a touch of overshoot, for each letter's pop.
    private static func pop(_ duration: Double) -> Animation { .timingCurve(0.34, 1.36, 0.64, 1, duration: duration) }

    var body: some View {
        ZStack {
            Color("LaunchBackground")
                .opacity(backdropOpacity)

            ZStack {
                ZStack {
                    ForEach(0..<6, id: \.self) { index in
                        letter(index)
                    }
                }
                .frame(width: Self.wordSize.width, height: Self.wordSize.height)
                .offset(x: Self.wordX)

                // The logo: its four shapes, moved together as one.
                ZStack {
                    ForEach(0..<Self.logoPieces.count, id: \.self) { index in
                        let piece = Self.logoPieces[index]
                        Image(piece.image)
                            .resizable()
                            .interpolation(.high)
                            .frame(width: Self.logoSize, height: Self.logoSize)
                            .offset(
                                x: pieceMoved[index] ? 0 : piece.from.width,
                                y: pieceMoved[index] ? 0 : piece.from.height
                            )
                            .opacity(pieceVisible[index] ? 1 : 0)
                    }
                }
                .scaleEffect(logoRevealScale)
                .scaleEffect(isTucked ? Self.tuckedLogoScale : 1)
                .offset(x: isTucked ? Self.tuckedLogoX : 0)
            }
            // Flattened once, so fading the lockup is one layer's opacity, not a
            // blend for each of its ten overlapping images.
            .compositingGroup()
            .scaleEffect(lockupScale)
            .opacity(lockupOpacity)
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
        .accessibilityHidden(true)
        .task { await play() }
    }

    /// One letter of the wordmark: the image cut to that letter, so each can move on its own.
    private func letter(_ index: Int) -> some View {
        let from = Self.letterCuts[index] * Self.wordSize.width
        let to = Self.letterCuts[index + 1] * Self.wordSize.width
        return Image("SplashWordmark")
            .resizable()
            .interpolation(.high)
            .frame(width: Self.wordSize.width, height: Self.wordSize.height)
            // A plain rectangular clip: far cheaper per frame than a mask layer.
            .clipShape(LetterClip(from: from, to: to))
            .opacity(letterVisible[index] ? 1 : 0)
            .offset(x: letterSettled[index] ? 0 : -14, y: letterSettled[index] ? 0 : 7)
    }

    private func play() async {
        guard !reduceMotion else {
            // The finished lockup, faded in and out.
            isTucked = true
            logoRevealScale = 1
            pieceMoved = Array(repeating: true, count: 4)
            letterSettled = Array(repeating: true, count: 6)
            withAnimation(.easeOut(duration: 0.3)) {
                pieceVisible = Array(repeating: true, count: 4)
                letterVisible = Array(repeating: true, count: 6)
            }
            onLogoBuilt()
            try? await Task.sleep(for: .milliseconds(900))
            onReveal()
            withAnimation(.easeOut(duration: 0.3)) {
                lockupOpacity = 0
                backdropOpacity = 0
            }
            try? await Task.sleep(for: .milliseconds(320))
            onFinish()
            return
        }

        // 1. The logo builds itself: its shapes fly in one after another.
        try? await Task.sleep(for: .milliseconds(120))
        withAnimation(Self.easeOut(0.7)) {
            logoRevealScale = 1
        }
        for index in 0..<Self.logoPieces.count {
            let delay = Self.logoPieces[index].delay
            withAnimation(Self.pop(0.46).delay(delay)) {
                pieceMoved[index] = true
            }
            withAnimation(Self.easeOut(0.24).delay(delay)) {
                pieceVisible[index] = true
            }
        }

        // 2. It tucks left, and the letters pop in from its side in a wave.
        try? await Task.sleep(for: .milliseconds(720))
        onLogoBuilt()
        withAnimation(Self.easeInOut(0.56)) {
            isTucked = true
        }
        for index in 0..<6 {
            let delay = 0.22 + 0.045 * Double(index)
            withAnimation(Self.pop(0.48).delay(delay)) {
                letterSettled[index] = true
            }
            withAnimation(Self.easeOut(0.42).delay(delay)) {
                letterVisible[index] = true
            }
        }

        // 3. The lockup lifts away and the backdrop clears onto the app.
        try? await Task.sleep(for: .milliseconds(1060))
        withAnimation(Self.easeIn(0.32)) {
            lockupScale = 1.08
            lockupOpacity = 0
        }
        withAnimation(Self.easeOut(0.38).delay(0.08)) {
            backdropOpacity = 0
        }
        try? await Task.sleep(for: .milliseconds(80))
        onReveal()
        try? await Task.sleep(for: .milliseconds(400))
        onFinish()
    }
}

/// The vertical strip of a wordmark image between two x positions.
private struct LetterClip: Shape {
    let from: CGFloat
    let to: CGFloat

    func path(in rect: CGRect) -> Path {
        Path(CGRect(x: from, y: rect.minY, width: to - from, height: rect.height))
    }
}
