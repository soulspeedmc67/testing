import SwiftUI

/// Shown instead of ADD on an item that is out of stock: "Notify me" tells the
/// shop someone wants it (the owner sees it under "Restock requests") and the
/// shopper gets a "Back in stock" notification once it's there. Tapping again
/// takes the request back. A short note under the button says what happened.
struct NotifyMeButton: View {
    let productId: String
    let productName: String
    var width: CGFloat = 72
    var height: CGFloat = 32
    var cornerRadius: CGFloat = 9
    var fontSize: CGFloat = 11.5

    @ObservedObject private var requests = RestockRequests.shared
    @State private var isBusy = false
    @State private var note: String?

    private static let askedColor = Color(red: 0.09, green: 0.64, blue: 0.29)

    var body: some View {
        let asked = requests.hasAsked(productId)
        let tint = asked ? Self.askedColor : Color.brandOrange
        let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
        Button(action: toggle) {
            HStack(spacing: 3) {
                Image(systemName: asked ? "checkmark" : (isBusy ? "bell.badge.fill" : "bell"))
                    .font(.system(size: fontSize, weight: .heavy))
                Text(asked ? "Asked" : "Notify me")
                    .font(.system(size: fontSize, weight: .heavy, design: .rounded))
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
            }
            .foregroundColor(tint)
            .frame(width: width, height: height)
            .background(asked ? Self.askedColor.opacity(0.10) : Color.surface, in: shape)
            .overlay(shape.strokeBorder(tint.opacity(asked ? 0.5 : 1), lineWidth: 1.2))
            .contentShape(shape)
        }
        .buttonStyle(PressableButtonStyle(scale: 0.92))
        .disabled(isBusy)
        .accessibilityLabel(asked ? "You'll be told when \(productName) is back. Double tap to cancel." : "Notify me when \(productName) is back")
        .overlay(alignment: .top) {
            if let note {
                Text(note)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.black.opacity(0.82), in: Capsule())
                    .fixedSize()
                    .offset(y: -(height / 2 + 22))
                    .transition(.opacity.combined(with: .scale(scale: 0.9)))
                    .allowsHitTesting(false)
            }
        }
        .animation(.easeOut(duration: 0.2), value: note)
    }

    private func toggle() {
        guard !isBusy else { return }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        isBusy = true
        Task {
            let text: String
            do {
                let nowAsked = try await requests.toggle(productId)
                text = nowAsked ? "We'll tell you when it's back" : "Okay, no reminder"
            } catch {
                text = error.localizedDescription
            }
            isBusy = false
            note = text
            try? await Task.sleep(for: .seconds(2.2))
            if note == text { note = nil }
        }
    }
}
