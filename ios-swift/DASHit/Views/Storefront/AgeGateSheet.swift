import SwiftUI

/// Statutory 18+ declaration shown before an age-restricted item can enter the
/// cart. Mirrors the web age gate (`src/context/AgeGateContext.jsx`): confirming
/// once covers the rest of the session.
struct AgeGateSheet: View {
    let product: Product
    let onConfirm: () -> Void

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 0) {
            Text("18+")
                .font(.system(size: 22, weight: .black, design: .rounded))
                .foregroundColor(.white)
                .frame(width: 60, height: 60)
                .background(Circle().fill(Color.danger))
                .padding(.top, 28)
                .accessibilityHidden(true)

            Text("Are you 18 or older?")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.textPrimary)
                .padding(.top, 14)

            (Text(product.name).bold().foregroundColor(.textPrimary)
                + Text(" is an age-restricted item under statutory laws.").foregroundColor(.textSecondary))
                .font(.system(size: 14))
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.top, 6)
                .padding(.horizontal, 28)

            HStack(alignment: .top, spacing: 10) {
                Image(systemName: "person.text.rectangle")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.caution)
                VStack(alignment: .leading, spacing: 3) {
                    Text("Government photo ID required on delivery")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.textPrimary)
                    Text("Our rider is legally required to check a government photo ID. Orders without age proof can't be handed over.")
                        .font(.system(size: 12))
                        .foregroundColor(.textMuted)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
            }
            .padding(14)
            .dashitCard(cornerRadius: 16)
            .padding(.horizontal, 20)
            .padding(.top, 20)

            VStack(spacing: 6) {
                Button {
                    HapticsManager.shared.medium()
                    onConfirm()
                    dismiss()
                } label: {
                    Text("I'm 18 or older — Confirm")
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
                    Text("I'm under 18 (Cancel)")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.textMuted)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.pressable)
            }
            .padding(.horizontal, 20)
            .padding(.top, 22)

            Spacer(minLength: 8)
        }
        .dashitSheet([.height(500), .large])
    }
}
