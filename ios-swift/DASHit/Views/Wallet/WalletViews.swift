import SwiftUI

/// What opens the wallet sheet; `celebrate` is the first-time welcome.
struct WalletSheetRequest: Identifiable {
    let id = UUID()
    let celebrate: Bool
}

/// The wallet button in the home header, left of the profile button, showing what is left.
struct WalletChip: View {
    let balance: Int
    let action: () -> Void

    var body: some View {
        Button {
            HapticsManager.shared.light()
            action()
        } label: {
            HStack(spacing: 6) {
                Image(systemName: "wallet.pass.fill")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.brandAccent)
                Text("₹\(balance)")
                    .font(.system(size: 14, weight: .heavy))
                    .foregroundColor(.textPrimary)
                    .monospacedDigit()
                    .contentTransition(.numericText(value: Double(balance)))
            }
            .padding(.horizontal, 12)
            .frame(height: 38)
            .background(Color.surfaceRaised, in: Capsule())
            .overlay(Capsule().strokeBorder(Color.hairline, lineWidth: 1))
        }
        .buttonStyle(PressableButtonStyle(scale: 0.94))
        .accessibilityLabel("Wallet, ₹\(balance) left")
    }
}

/// The wallet as a bottom sheet. With `celebrate` it is the welcome: the icon
/// springs in, the amount counts up and a short sprinkle of confetti falls.
struct WalletSheet: View {
    let balance: Int
    let credit: Int
    let maxPerOrder: Int
    let celebrate: Bool
    var onClose: () -> Void

    @State private var iconIn = false
    @State private var shown = 0
    @State private var confettiFired = false

    var body: some View {
        ZStack(alignment: .top) {
            if celebrate {
                ConfettiBurst(fired: confettiFired)
                    .frame(height: 1)
                    .padding(.top, 80)
                    .allowsHitTesting(false)
            }

            VStack(spacing: 0) {
                Image(systemName: "wallet.pass.fill")
                    .font(.system(size: 30, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(width: 64, height: 64)
                    .background(Color.brandAccent, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                    .scaleEffect(iconIn ? 1 : 0.6)
                    .opacity(iconIn ? 1 : 0)

                Text(celebrate ? "You got ₹\(credit)!" : "Your wallet")
                    .font(.system(size: 22, weight: .heavy))
                    .foregroundColor(.textPrimary)
                    .padding(.top, 16)

                Text(celebrate ? "A welcome gift from DASHit, just for you." : "Money you can spend on your orders.")
                    .font(.system(size: 14))
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.top, 4)

                VStack(spacing: 2) {
                    Text("BALANCE")
                        .font(.system(size: 12, weight: .bold))
                        .tracking(1)
                        .foregroundColor(.textMuted)
                    Text("₹\(shown)")
                        .font(.system(size: 40, weight: .black))
                        .foregroundColor(.textPrimary)
                        .monospacedDigit()
                        .contentTransition(.numericText(value: Double(shown)))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.surfaceMuted, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(Color.hairline, lineWidth: 1))
                .padding(.top, 20)

                Text(balance > 0
                    ? "It comes off your bill by itself when you order, up to ₹\(maxPerOrder) each time."
                    : "You've used your wallet credit. Thanks for ordering with us!")
                    .font(.system(size: 13.5))
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.top, 16)

                Spacer(minLength: 16)

                Button {
                    onClose()
                } label: {
                    Text(celebrate ? "Start shopping" : "Got it")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(Color.brandAccent, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(PressableButtonStyle(scale: 0.98))
            }
            .padding(.horizontal, 24)
            .padding(.top, 28)
            .padding(.bottom, 16)
        }
        .background(Color.surfaceRaised)
        .presentationDetents([.height(440)])
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(28)
        .task {
            withAnimation(.spring(response: 0.5, dampingFraction: 0.6).delay(0.1)) { iconIn = true }
            if celebrate {
                HapticsManager.shared.success()
                confettiFired = true
            }
            guard balance > 0 else { return }
            try? await Task.sleep(for: .milliseconds(250))
            withAnimation(.easeOut(duration: 1.1)) { shown = balance }
        }
    }
}

/// A short, quiet sprinkle that rises from the icon and falls away.
private struct ConfettiBurst: View {
    let fired: Bool

    private struct Speck: Identifiable {
        let id: Int
        let dx: CGFloat
        let dy: CGFloat
        let size: CGFloat
        let color: Color
    }

    private let specks: [Speck] = (0..<32).map { index in
        let palette: [Color] = [.brandAccent, Color(red: 1, green: 0.70, blue: 0.48), .white, Color(red: 0.02, green: 0.09, blue: 0.22)]
        let angle = Double.pi * (0.15 + 0.7 * Double.random(in: 0...1))
        let speed = Double.random(in: 90...190)
        return Speck(
            id: index,
            dx: CGFloat(cos(angle) * speed * (Bool.random() ? 1 : -1)),
            dy: CGFloat(-sin(angle) * speed + Double.random(in: 120...260)),
            size: CGFloat.random(in: 4...8),
            color: palette[index % palette.count]
        )
    }

    var body: some View {
        ZStack {
            ForEach(specks) { speck in
                Circle()
                    .fill(speck.color)
                    .frame(width: speck.size, height: speck.size)
                    .offset(x: fired ? speck.dx : 0, y: fired ? speck.dy : 0)
                    .opacity(fired ? 0 : 1)
                    .animation(.easeOut(duration: 1.6), value: fired)
            }
        }
    }
}
