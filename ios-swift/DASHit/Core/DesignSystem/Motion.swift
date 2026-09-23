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
