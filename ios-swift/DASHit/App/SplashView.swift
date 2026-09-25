import SwiftUI

/// Takes over from the plain midnight launch screen and hands over to the app.
/// The logo sharpens out of a blur, then shrinks and tucks to the left while
/// the "dashit" wordmark is uncovered behind it, sharpening as it appears; the
/// lockup then lifts away in a blur and the backdrop clears onto the app.
/// Same timings and curves as the Android `SplashOverlay`.
struct SplashView: View {
    /// Called as the backdrop starts to clear, so the app can settle into place.
    var onReveal: () -> Void
    /// Called once nothing of the splash is left on screen.
    var onFinish: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    // 1. Reveal
    @State private var logoOpacity: Double = 0
    @State private var logoBlur: CGFloat = 14
    @State private var logoRevealScale: CGFloat = 0.86
    // 2. Tuck: the logo moves left and the wipe uncovers the wordmark, together
    @State private var isTucked = false
    @State private var wordOpacity: Double = 0
    @State private var wordBlur: CGFloat = 8
    // 3. Exit
    @State private var lockupScale: CGFloat = 1
    @State private var lockupBlur: CGFloat = 0
    @State private var lockupOpacity: Double = 1
    @State private var backdropOpacity: Double = 1

    // Lockup geometry, in points around the screen centre.
    private static let logoSize: CGFloat = 114.67
    private static let tuckedLogoX: CGFloat = -82.35
    private static let tuckedLogoScale: CGFloat = 0.5
    private static let wordSize = CGSize(width: 158, height: 34)
    private static let wordX: CGFloat = 29.3
    /// Left edge of the wipe in the wordmark's own coordinates: it follows the
    /// logo's right edge, from where the logo starts to where it comes to rest.
    private static let wipeStart: CGFloat = 98.4
    private static let wipeEnd: CGFloat = -8.3

    private static func easeOut(_ duration: Double) -> Animation { .timingCurve(0.22, 1, 0.36, 1, duration: duration) }
    private static func easeIn(_ duration: Double) -> Animation { .timingCurve(0.55, 0, 1, 0.45, duration: duration) }
    private static func easeInOut(_ duration: Double) -> Animation { .timingCurve(0.65, 0, 0.35, 1, duration: duration) }

    var body: some View {
        ZStack {
            Color("LaunchBackground")
                .opacity(backdropOpacity)

            ZStack {
                Image("SplashWordmark")
                    .resizable()
                    .interpolation(.high)
                    .frame(width: Self.wordSize.width, height: Self.wordSize.height)
                    .mask(alignment: .leading) {
                        Rectangle()
                            .frame(width: Self.wordSize.width + 40)
                            .offset(x: isTucked ? Self.wipeEnd : Self.wipeStart)
                    }
                    .blur(radius: wordBlur)
                    .opacity(wordOpacity)
                    .offset(x: Self.wordX)

                Image("SplashLogo")
                    .resizable()
                    .interpolation(.high)
                    .frame(width: Self.logoSize, height: Self.logoSize)
                    .blur(radius: logoBlur)
                    .scaleEffect(logoRevealScale)
                    .opacity(logoOpacity)
                    .scaleEffect(isTucked ? Self.tuckedLogoScale : 1)
                    .offset(x: isTucked ? Self.tuckedLogoX : 0)
            }
            .scaleEffect(lockupScale)
            .blur(radius: lockupBlur)
            .opacity(lockupOpacity)
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
        .accessibilityHidden(true)
        .task { await play() }
    }

    private func play() async {
        guard !reduceMotion else {
            // The finished lockup, faded in and out.
            isTucked = true
            logoBlur = 0
            logoRevealScale = 1
            wordBlur = 0
            withAnimation(.easeOut(duration: 0.3)) {
                logoOpacity = 1
                wordOpacity = 1
            }
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

        // 1. The logo sharpens out of a blur.
        try? await Task.sleep(for: .milliseconds(120))
        withAnimation(Self.easeOut(0.52)) {
            logoOpacity = 1
            logoBlur = 0
            logoRevealScale = 1
        }

        // 2. It tucks left and the wordmark is uncovered behind it.
        try? await Task.sleep(for: .milliseconds(640))
        withAnimation(Self.easeInOut(0.56)) {
            isTucked = true
        }
        withAnimation(Self.easeOut(0.48).delay(0.08)) {
            wordOpacity = 1
            wordBlur = 0
        }

        // 3. The lockup lifts away and the backdrop clears onto the app.
        try? await Task.sleep(for: .milliseconds(830))
        withAnimation(Self.easeIn(0.32)) {
            lockupScale = 1.08
            lockupBlur = 8
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
