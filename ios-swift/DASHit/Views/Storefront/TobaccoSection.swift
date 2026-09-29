#if TOBACCO_SECTION
import SwiftUI

// The cigarette section's screens. Only built when the app is built with the
// TOBACCO_SECTION switch; see Tobacco.swift for why it's off by default.

/// Under a tobacco search: where the items are, and the health caution.
struct TobaccoSearchCard: View {
    var onView: () -> Void

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
            Spacer(minLength: 0)
            Button {
                HapticsManager.shared.light()
                onView()
            } label: {
                Text("View items")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(1)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 9)
                    .background(Capsule().fill(Color.brandOrange))
            }
            .buttonStyle(.pressable)
        }
        .padding(14)
        .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(Color.surfaceRaised))
        .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(Color.hairline, lineWidth: 1))
    }
}

/// The tobacco list, opened from search after the declaration: back arrow and
/// title, the health warning, then the usual product cards (as plain packs).
struct TobaccoListView: View {
    let products: [Product]
    var onOpenProduct: (Product) -> Void
    var onRequestAgeConfirmation: (Product) -> Void
    var onBack: () -> Void

    @ObservedObject private var cart = CartViewModel.shared
    private let gridColumns = Array(repeating: GridItem(.flexible(), spacing: 8, alignment: .top), count: 3)

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 4) {
                Button(action: onBack) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 19, weight: .semibold))
                        .foregroundColor(.textPrimary)
                        .frame(width: 40, height: 50)
                        .contentShape(Rectangle())
                }
                .accessibilityLabel("Back")
                Text("Tobacco")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.textPrimary)
                Spacer()
                Text("\(products.count) item\(products.count == 1 ? "" : "s")")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.textMuted)
            }
            .padding(.leading, 6)
            .padding(.trailing, 16)
            .padding(.top, 6)
            .padding(.bottom, 6)
            .overlay(alignment: .bottom) {
                Rectangle().fill(Color.hairline).frame(height: 1)
            }

            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    HStack(alignment: .top, spacing: 8) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.danger)
                        Text(Tobacco.healthWarning)
                            .font(.system(size: 12.5, weight: .medium))
                            .foregroundColor(.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(.top, 14)

                    if products.isEmpty {
                        Text("Nothing here right now.")
                            .font(.system(size: 14))
                            .foregroundColor(.textMuted)
                            .frame(maxWidth: .infinity)
                            .padding(.top, 60)
                    } else {
                        LazyVGrid(columns: gridColumns, spacing: 10) {
                            ForEach(products) { product in
                                ProductCardView(
                                    product: product,
                                    onOpen: { onOpenProduct(product) },
                                    onRequestAgeConfirmation: { onRequestAgeConfirmation(product) }
                                )
                            }
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }
        }
        .background(Color.surface.ignoresSafeArea())
        .safeAreaInset(edge: .bottom, spacing: 0) {
            FloatingCartBarView {
                cart.isCartSheetPresented = true
            }
            .padding(.bottom, 10)
        }
    }
}

/// A plain, unbranded cigarette pack (the website's `tobacco-plain-pack.svg`),
/// shown instead of any brand photo.
struct PlainPackArt: View {
    var body: some View {
        Canvas { context, size in
            // The backdrop fills the whole frame; the pack sits in the middle.
            context.fill(Path(CGRect(origin: .zero, size: size)), with: .color(Color(hex: 0xF1EEEA)))
            let s = min(size.width, size.height) / 400
            context.translateBy(x: (size.width - 400 * s) / 2, y: (size.height - 400 * s) / 2)
            context.scaleBy(x: s, y: s)

            context.fill(Path(ellipseIn: CGRect(x: 111, y: 321, width: 184, height: 18)), with: .color(Color.black.opacity(0.08)))

            var side = Path()
            side.move(to: CGPoint(x: 262, y: 100))
            side.addLine(to: CGPoint(x: 284, y: 88))
            side.addLine(to: CGPoint(x: 284, y: 308))
            side.addLine(to: CGPoint(x: 262, y: 320))
            side.closeSubpath()
            context.fill(side, with: .color(Color(hex: 0xCFCFD6)))

            var top = Path()
            top.move(to: CGPoint(x: 122, y: 100))
            top.addLine(to: CGPoint(x: 144, y: 88))
            top.addLine(to: CGPoint(x: 284, y: 88))
            top.addLine(to: CGPoint(x: 262, y: 100))
            top.closeSubpath()
            context.fill(top, with: .color(Color(hex: 0xF8F8FA)))

            let front = Path(roundedRect: CGRect(x: 122, y: 100, width: 140, height: 220), cornerRadius: 4)
            context.fill(front, with: .color(Color.white))
            context.stroke(front, with: .color(Color(hex: 0xE1E1E6)), lineWidth: 1.5)

            var band = Path()
            band.move(to: CGPoint(x: 122, y: 152))
            band.addLine(to: CGPoint(x: 262, y: 152))
            context.stroke(band, with: .color(Color(hex: 0xDADADF)), lineWidth: 2)

            let label = Path(roundedRect: CGRect(x: 150, y: 204, width: 84, height: 40), cornerRadius: 4)
            context.fill(label, with: .color(Color(hex: 0xF3F3F5)))
            context.stroke(label, with: .color(Color(hex: 0xE3E3E8)), lineWidth: 1.5)
            context.fill(Path(roundedRect: CGRect(x: 162, y: 216, width: 60, height: 5), cornerRadius: 2.5), with: .color(Color(hex: 0xC8C8CE)))
            context.fill(Path(roundedRect: CGRect(x: 170, y: 228, width: 44, height: 4), cornerRadius: 2), with: .color(Color(hex: 0xD7D7DC)))
        }
        .accessibilityHidden(true)
    }
}
#endif
