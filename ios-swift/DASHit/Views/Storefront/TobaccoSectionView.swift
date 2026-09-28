import SwiftUI

/// The tobacco list, opened from search after the declaration: a health
/// warning, then every tobacco item as a plain pack with its price.
struct TobaccoSectionView: View {
    let products: [Product]

    @ObservedObject private var cart = CartViewModel.shared
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Tobacco")
                    .font(.system(size: 22, weight: .heavy))
                    .foregroundColor(.textPrimary)
                Spacer()
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.textSecondary)
                        .frame(width: 30, height: 30)
                        .background(Color.surfaceMuted, in: Circle())
                        .frame(width: 44, height: 44)
                        .contentShape(Circle())
                }
                .buttonStyle(PressableButtonStyle(scale: 0.85))
                .accessibilityLabel("Close")
            }
            .padding(.leading, 20)
            .padding(.trailing, 10)
            .padding(.top, 18)

            HStack(spacing: 8) {
                Image(systemName: "exclamationmark.triangle")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.danger)
                Text(Tobacco.healthWarning)
                    .font(.system(size: 12.5, weight: .medium))
                    .foregroundColor(.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 20)
            .padding(.top, 4)
            .padding(.bottom, 14)

            Rectangle().fill(Color.hairline).frame(height: 1)

            if products.isEmpty {
                Text("Nothing here right now.")
                    .font(.system(size: 14))
                    .foregroundColor(.textMuted)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(products) { product in
                            row(product)
                            Rectangle().fill(Color.hairlineSoft).frame(height: 1).padding(.leading, 88)
                        }
                    }
                    .padding(.bottom, 24)
                }
            }
        }
        .background(Color.surface.ignoresSafeArea())
        .dashitSheet([.large])
    }

    private func row(_ product: Product) -> some View {
        HStack(spacing: 14) {
            PlainPackArt()
                .frame(width: 56, height: 56)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Color.hairline, lineWidth: 1))

            VStack(alignment: .leading, spacing: 3) {
                Text(product.name)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.textPrimary)
                    .lineLimit(2)
                Text(product.unit)
                    .font(.system(size: 12.5))
                    .foregroundColor(.textMuted)
                Text(CurrencyFormatter.format(product.price))
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundColor(.textPrimary)
                    .padding(.top, 1)
            }
            Spacer(minLength: 8)

            QuantityStepper(
                quantity: cart.quantity(for: product.id),
                isEnabled: product.isAvailable,
                onAdd: { cart.add(product: product) },
                onIncrement: { cart.add(product: product) },
                onDecrement: { cart.decrementLatest(productId: product.id) }
            )
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .opacity(product.isAvailable ? 1 : 0.55)
    }
}

/// Under a tobacco search: where the items are, and the health caution.
/// Only ever shown in answer to a search, never while browsing.
struct TobaccoSearchCard: View {
    let onView: () -> Void

    var body: some View {
        HStack(spacing: 14) {
            PlainPackArt()
                .frame(width: 52, height: 52)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

            VStack(alignment: .leading, spacing: 3) {
                Text("Looking for tobacco products?")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.textPrimary)
                Text("Caution: Tobacco products are injurious to health")
                    .font(.system(size: 12))
                    .foregroundColor(.textMuted)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 8)

            Button {
                HapticsManager.shared.light()
                onView()
            } label: {
                Text("View items")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white)
                    .fixedSize()
                    .padding(.horizontal, 14)
                    .frame(height: 36)
                    .background(Color.brandOrange, in: Capsule())
            }
            .buttonStyle(.pressable)
        }
        .padding(14)
        .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(Color.hairline, lineWidth: 1))
    }
}

/// A plain, unbranded cigarette pack (the website's `tobacco-plain-pack.svg`),
/// shown instead of any brand photo.
struct PlainPackArt: View {
    var body: some View {
        Canvas { ctx, size in
            let s = min(size.width, size.height) / 400
            var c = ctx
            c.translateBy(x: (size.width - 400 * s) / 2, y: (size.height - 400 * s) / 2)
            c.scaleBy(x: s, y: s)

            c.fill(Path(CGRect(x: 0, y: 0, width: 400, height: 400)), with: .color(Color(hex: 0xF1EEEA)))
            c.fill(Path(ellipseIn: CGRect(x: 111, y: 321, width: 184, height: 18)), with: .color(.black.opacity(0.08)))

            var side = Path()
            side.addLines([CGPoint(x: 262, y: 100), CGPoint(x: 284, y: 88), CGPoint(x: 284, y: 308), CGPoint(x: 262, y: 320)])
            side.closeSubpath()
            c.fill(side, with: .color(Color(hex: 0xCFCFD6)))

            var top = Path()
            top.addLines([CGPoint(x: 122, y: 100), CGPoint(x: 144, y: 88), CGPoint(x: 284, y: 88), CGPoint(x: 262, y: 100)])
            top.closeSubpath()
            c.fill(top, with: .color(Color(hex: 0xF8F8FA)))

            let front = Path(roundedRect: CGRect(x: 122, y: 100, width: 140, height: 220), cornerRadius: 4)
            c.fill(front, with: .color(.white))
            c.stroke(front, with: .color(Color(hex: 0xE1E1E6)), lineWidth: 1.5)

            var lid = Path()
            lid.move(to: CGPoint(x: 122, y: 152))
            lid.addLine(to: CGPoint(x: 262, y: 152))
            c.stroke(lid, with: .color(Color(hex: 0xDADADF)), lineWidth: 2)

            let label = Path(roundedRect: CGRect(x: 150, y: 204, width: 84, height: 40), cornerRadius: 4)
            c.fill(label, with: .color(Color(hex: 0xF3F3F5)))
            c.stroke(label, with: .color(Color(hex: 0xE3E3E8)), lineWidth: 1.5)
            c.fill(Path(roundedRect: CGRect(x: 162, y: 216, width: 60, height: 5), cornerRadius: 2.5), with: .color(Color(hex: 0xC8C8CE)))
            c.fill(Path(roundedRect: CGRect(x: 170, y: 228, width: 44, height: 4), cornerRadius: 2), with: .color(Color(hex: 0xD7D7DC)))
        }
        .accessibilityHidden(true)
    }
}
