import SwiftUI

/// The code step of number sign-in, shared by the sign-in screen and account
/// deletion: where the code went, six boxes for it, and Resend once the
/// server's wait is over. `onComplete` fires as the sixth digit goes in, so
/// signing in never needs a reach for the button; hosts clear `code` when
/// it's refused, ready for another try. Same as Android's SignInCodeStep.
struct SignInCodeEntry: View {
    /// Digits in a sign-in code, as the sign-in server sends them.
    static let length = 6

    let mobile: String
    @Binding var code: String
    let resendAt: Date
    /// Matches the host's fields: `.surface` on the sign-in panel.
    var boxColor: Color = .surface
    var onChangeNumber: (() -> Void)? = nil
    let onResend: () -> Void
    let onComplete: (String) -> Void

    @ObservedObject private var auth = AuthService.shared
    @FocusState private var isFocused: Bool

    /// "+91 98765 43210"
    static func formatted(_ mobile: String) -> String {
        "+91 \(mobile.prefix(5)) \(mobile.suffix(5))"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            (Text("Enter the 6-digit code we sent on WhatsApp to ")
                + Text(Self.formatted(mobile)).foregroundColor(.textPrimary).bold()
                + Text("."))
                .font(.system(size: 15))
                .foregroundColor(.textSecondary)
                .fixedSize(horizontal: false, vertical: true)

            ZStack {
                // The real field, drawn invisibly under the boxes: it takes
                // typing, pasting and the keyboard's code suggestion.
                TextField("", text: $code)
                    .keyboardType(.numberPad)
                    .textContentType(.oneTimeCode)
                    .foregroundColor(.clear)
                    .tint(.clear)
                    .frame(height: 56)
                    .focused($isFocused)
                    .accessibilityLabel("6-digit code")
                    .onChange(of: code) { old, value in
                        let digits = String(value.filter(\.isNumber).prefix(Self.length))
                        if digits != value {
                            code = digits
                            return
                        }
                        if digits.count == Self.length, old.count != Self.length {
                            onComplete(digits)
                        }
                    }
                HStack(spacing: 8) {
                    ForEach(0..<Self.length, id: \.self) { index in
                        box(at: index)
                    }
                }
                .allowsHitTesting(false)
                .accessibilityHidden(true)
            }
            .contentShape(Rectangle())
            .onTapGesture { isFocused = true }

            HStack {
                if let onChangeNumber {
                    Button("Change number") {
                        HapticsManager.shared.light()
                        onChangeNumber()
                    }
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.textSecondary)
                }
                Spacer()
                ResendCodeButton(resendAt: resendAt) {
                    HapticsManager.shared.light()
                    onResend()
                }
            }
            .disabled(auth.isAuthenticating)
        }
        .onAppear { isFocused = true }
    }

    private func box(at index: Int) -> some View {
        let digits = Array(code)
        let isNext = index == digits.count && isFocused
        return Text(index < digits.count ? String(digits[index]) : "")
            .font(.system(size: 22, weight: .bold, design: .rounded))
            .foregroundColor(.textPrimary)
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(boxColor, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(isNext ? Color.brandOrange : Color.hairlineStrong, lineWidth: isNext ? 1.5 : 1)
            )
    }
}

/// "Resend code in 0:24", then a tappable "Resend code".
private struct ResendCodeButton: View {
    let resendAt: Date
    let action: () -> Void

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            let secondsLeft = max(0, Int(resendAt.timeIntervalSince(context.date).rounded(.up)))
            if secondsLeft > 0 {
                Text("Resend code in \(secondsLeft / 60):\(String(format: "%02d", secondsLeft % 60))")
                    .font(.system(size: 14))
                    .foregroundColor(.textMuted)
                    .monospacedDigit()
            } else {
                Button("Resend code", action: action)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.brandOrange)
            }
        }
    }
}
