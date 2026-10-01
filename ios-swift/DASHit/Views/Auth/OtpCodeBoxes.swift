import SwiftUI

/// The six-digit code from the text message: six boxes over one hidden field,
/// so the number pad, paste and the keyboard's "From Messages" suggestion all
/// work. `onComplete` fires when the sixth digit is in.
struct OtpCodeBoxes: View {
    static let length = 6

    @Binding var code: String
    var onComplete: (String) -> Void
    @FocusState private var isFocused: Bool

    var body: some View {
        ZStack {
            TextField("", text: $code)
                .keyboardType(.numberPad)
                .textContentType(.oneTimeCode)
                .focused($isFocused)
                .opacity(0.01)
                .onChange(of: code) { _, value in
                    let digits = String(value.filter(\.isNumber).prefix(Self.length))
                    if digits != value { code = digits }
                    if digits.count == Self.length { onComplete(digits) }
                }

            HStack(spacing: 8) {
                ForEach(0..<Self.length, id: \.self) { index in
                    let digit = index < code.count ? String(Array(code)[index]) : ""
                    Text(digit)
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(.textPrimary)
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                        .background(Color.surface, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .strokeBorder(index == code.count ? Color.brandOrange : Color.hairlineStrong, lineWidth: 1)
                        )
                }
            }
            .allowsHitTesting(false)
        }
        .contentShape(Rectangle())
        .onTapGesture { isFocused = true }
        .onAppear { isFocused = true }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Code from the text message")
        .accessibilityValue(code)
    }
}
