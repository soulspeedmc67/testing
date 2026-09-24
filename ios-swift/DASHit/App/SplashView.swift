import SwiftUI

/// Picks up from the static launch screen and hands over to the app. The first
/// frame is the launch screen exactly (the mark is the launch image split into
/// its white shapes and orange dash), then the dash winds back and streaks off,
/// the mark zooms away and the midnight backdrop clears onto the app.
struct SplashView: View {
    /// Called as the backdrop starts to clear, so the app can settle into place.
    var onReveal: () -> Void
    /// Called once nothing of the splash is left on screen.
    var onFinish: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var dashOffset: CGFloat = 0
    @State private var dashStretch: CGFloat = 1
    @State private var markScale: CGFloat = 1
    @State private var markOpacity: Double = 1
    @State private var backdropOpacity: Double = 1

    /// The dash's left end within the mark image, so it stretches from there.
    private static let dashAnchor = UnitPoint(x: 0.084, y: 0.497)

    var body: some View {
        GeometryReader { geo in
            ZStack {
                Color("LaunchBackground")
                    .opacity(backdropOpacity)
                ZStack {
                    Image("SplashMark")
                        .scaleEffect(markScale)
                        .opacity(markOpacity)
                    Image("SplashDash")
                        .scaleEffect(x: dashStretch, y: 1, anchor: Self.dashAnchor)
                        .offset(x: dashOffset)
                }
            }
            .frame(width: geo.size.width, height: geo.size.height)
            .task { await play(travel: geo.size.width) }
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    private func play(travel: CGFloat) async {
        guard !reduceMotion else {
            try? await Task.sleep(for: .milliseconds(200))
            onReveal()
            withAnimation(.easeOut(duration: 0.3)) {
                backdropOpacity = 0
                markOpacity = 0
                dashStretch = 1
            }
            try? await Task.sleep(for: .milliseconds(320))
            onFinish()
            return
        }

        // Hold the launch frame a beat, so the handoff is invisible.
        try? await Task.sleep(for: .milliseconds(150))

        // Wind-up: the dash pulls back and the mark tightens.
        withAnimation(.easeOut(duration: 0.22)) {
            dashOffset = -7
            markScale = 0.96
        }
        try? await Task.sleep(for: .milliseconds(220))

        // The dash streaks off to the right; the mark zooms away behind it.
        withAnimation(.easeIn(duration: 0.32)) {
            dashOffset = travel
            dashStretch = 3.2
        }
        withAnimation(.easeIn(duration: 0.28).delay(0.02)) {
            markScale = 1.3
        }
        withAnimation(.easeOut(duration: 0.2).delay(0.02)) {
            markOpacity = 0
        }
        withAnimation(.easeOut(duration: 0.34).delay(0.09)) {
            backdropOpacity = 0
        }
        try? await Task.sleep(for: .milliseconds(10))
        onReveal()

        try? await Task.sleep(for: .milliseconds(460))
        onFinish()
    }
}
