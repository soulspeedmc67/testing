import SwiftUI

/// "Orders may be delayed" with the admin's reason, shown on the home screen
/// and at checkout while the notice is on (`DelayNotice`).
struct DelayNoticeBanner: View {
    let notice: DelayNotice

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: notice.symbol)
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.caution)
            VStack(alignment: .leading, spacing: 2) {
                Text(notice.title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.textPrimary)
                Text(notice.message)
                    .font(.system(size: 12))
                    .foregroundColor(.textMuted)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.caution.opacity(0.10))
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.caution.opacity(0.35), lineWidth: 1))
        .accessibilityElement(children: .combine)
        .transition(.opacity.combined(with: .move(edge: .top)))
    }
}
