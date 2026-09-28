import SwiftUI

extension Animation {
    /// The house spring for taps, steppers, sheets and state changes.
    static let dashitSpring = Animation.spring(response: 0.35, dampingFraction: 0.75)
    /// Quicker and less bouncy, for press feedback that must track the finger.
    static let dashitSnappy = Animation.spring(response: 0.22, dampingFraction: 0.86)
}

/// Scales a button down while pressed and springs it back on release.
/// Visual only: haptics fire from the action, so a tap never buzzes twice.
struct PressableButtonStyle: ButtonStyle {
    var scale: CGFloat = 0.96

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? scale : 1)
            .opacity(configuration.isPressed ? 0.9 : 1)
            .animation(.dashitSnappy, value: configuration.isPressed)
    }
}

extension ButtonStyle where Self == PressableButtonStyle {
    static var pressable: PressableButtonStyle { PressableButtonStyle() }
}

extension View {
    /// Native sheet chrome shared by every DASHit bottom sheet.
    func dashitSheet(_ detents: Set<PresentationDetent>) -> some View {
        presentationDetents(detents)
            .presentationDragIndicator(.visible)
            .presentationCornerRadius(28)
            .presentationBackground(Color.surface)
    }
}

// MARK: - First look at the shop

/// Plays the "categories slide in from the left" entrance once per app
/// launch, the first time the categories are on screen. Coming back to the
/// home screen later doesn't replay it. Only touched from the main thread.
final class LaunchReveal {
    static let shared = LaunchReveal()
    private var played: Set<String> = []

    private init() {}

    func hasPlayed(_ key: String) -> Bool { played.contains(key) }
    func markPlayed(_ key: String) { played.insert(key) }
}

/// Whether the shop can be seen yet. The customer app covers its first
/// seconds with the splash (and, on the very first launch, the welcome
/// sign-in), so entrance animations wait for this instead of playing unseen.
final class AppReveal: ObservableObject {
    static let shared = AppReveal()

    /// Set by an app that covers its first frames and calls `reveal()` when
    /// they clear. Apps that don't (the admin app) play entrances straight away.
    var coversLaunch = false
    @Published private(set) var isRevealed = false

    private init() {}

    var canPlay: Bool { isRevealed || !coversLaunch }

    func reveal() {
        if !isRevealed { isRevealed = true }
    }
}

private struct SlideInFromLeading: ViewModifier {
    let index: Int
    let isShown: Bool

    func body(content: Content) -> some View {
        content
            .opacity(isShown ? 1 : 0)
            .offset(x: isShown ? 0 : -56)
            .scaleEffect(isShown ? 1 : 0.86, anchor: .leading)
            .blur(radius: isShown ? 0 : 4)
            .animation(
                .spring(response: 0.6, dampingFraction: 0.8).delay(isShown ? 0.055 * Double(min(index, 10)) : 0),
                value: isShown
            )
    }
}

extension View {
    /// Slides in from the leading edge after the `index` items before it.
    func slideInFromLeading(index: Int, isShown: Bool) -> some View {
        modifier(SlideInFromLeading(index: index, isShown: isShown))
    }

    /// Runs the launch entrance for `key` once `isReady` is true: `isShown`
    /// starts false the first time in this launch and flips to true straight
    /// after the view is on screen; every later appearance starts shown.
    func launchReveal(_ key: String, isReady: Bool, isShown: Binding<Bool>) -> some View {
        modifier(LaunchRevealTrigger(key: key, isReady: isReady, isShown: isShown))
    }
}

private struct LaunchRevealTrigger: ViewModifier {
    let key: String
    let isReady: Bool
    @Binding var isShown: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @ObservedObject private var app = AppReveal.shared

    func body(content: Content) -> some View {
        content
            .onAppear { playIfReady() }
            .onChange(of: isReady) { _, _ in playIfReady() }
            .onChange(of: app.isRevealed) { _, _ in playIfReady() }
    }

    private func playIfReady() {
        guard !isShown else { return }
        if reduceMotion || LaunchReveal.shared.hasPlayed(key) {
            isShown = true
            return
        }
        // Wait until there's something to show and the splash has cleared.
        guard isReady, app.canPlay else { return }
        LaunchReveal.shared.markPlayed(key)
        // A beat after the layout lands, so the slide is seen rather than skipped.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) {
            isShown = true
        }
    }
}
