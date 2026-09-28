import SwiftUI

/// "Please make sure…": the declaration before any tobacco is listed or added
/// to the cart, in the website's words (`TobaccoDeclarationSheet.jsx`).
/// Confirming is remembered on this device.
struct TobaccoDeclarationSheet: View {
    let onConfirm: () -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Please make sure…")
                .font(.system(size: 22, weight: .heavy))
                .foregroundColor(.textPrimary)
                .padding(.horizontal, 20)
                .padding(.top, 26)
                .padding(.bottom, 16)

            Rectangle().fill(Color.hairline).frame(height: 1)

            VStack(alignment: .leading, spacing: 16) {
                ForEach(Array(Tobacco.declarations.enumerated()), id: \.offset) { _, item in
                    HStack(alignment: .top, spacing: 14) {
                        Image(systemName: item.symbol)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(item.isRule ? .danger : .textSecondary)
                            .frame(width: 38, height: 38)
                            .background(Color.surfaceMuted, in: Circle())
                        Text(item.text)
                            .font(.system(size: 14))
                            .foregroundColor(.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                            .padding(.top, 2)
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 20)

            Text("Orders that break these rules are cancelled, and we are bound to report the account.")
                .font(.system(size: 12.5))
                .foregroundColor(.textMuted)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, 20)
                .padding(.top, 20)

            Button {
                openURL(Tobacco.termsURL)
            } label: {
                Text("Read terms and conditions")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.brandAccent)
                    .underline()
                    .frame(minHeight: 36)
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 20)

            Spacer(minLength: 12)

            VStack(spacing: 6) {
                Button {
                    HapticsManager.shared.medium()
                    onConfirm()
                    dismiss()
                } label: {
                    Text("Yes, I confirm")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(Color.brandOrange, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .buttonStyle(.pressable)

                Button {
                    HapticsManager.shared.light()
                    dismiss()
                } label: {
                    Text("Cancel")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.textMuted)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.pressable)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 8)
        }
        .dashitSheet([.height(560), .large])
    }
}

/// The declaration when an age-restricted item is added straight from a card.
/// Kept as its own name so the existing screens don't change.
struct AgeGateSheet: View {
    let product: Product
    let onConfirm: () -> Void

    var body: some View {
        TobaccoDeclarationSheet(onConfirm: onConfirm)
    }
}
