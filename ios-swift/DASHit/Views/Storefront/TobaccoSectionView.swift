import SwiftUI

/// The tobacco list, opened from search after the declaration. Laid out like
/// the other product screens: back button and title, then the same product
/// cards in a grid (as plain packs), each opening the product details, and
/// the cart bar at the bottom.
struct TobaccoSectionView: View {
    let products: [Product]
    /// The shopper wants the cart: this page closes first, then the cart opens.
    var onGoToCart: () -> Void = {}

    @ObservedObject private var cart = CartViewModel.shared
    @Environment(\.dismiss) private var dismiss
    @State private var detailProduct: Product? = nil
    @State private var opensCartAfterDetail = false

    private let gridColumns = Array(repeating: GridItem(.flexible(), spacing: 8, alignment: .top), count: 3)

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 4) {
                Button {
                    dismiss()
                } label: {
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
                    HStack(spacing: 8) {
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
                                    onOpen: { detailProduct = product }
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
                onGoToCart()
                dismiss()
            }
            .padding(.bottom, 10)
        }
        .sheet(item: $detailProduct, onDismiss: {
            if opensCartAfterDetail {
                opensCartAfterDetail = false
                onGoToCart()
                dismiss()
            }
        }) { product in
            ProductDetailSheet(product: product, onGoToCart: {
                opensCartAfterDetail = true
                detailProduct = nil
            })
        }
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
            // The backdrop fills the whole frame; the pack sits in the middle.
            ctx.fill(Path(CGRect(origin: .zero, size: size)), with: .color(Color(hex: 0xF1EEEA)))
            let s = min(size.width, size.height) / 400
            var c = ctx
            c.translateBy(x: (size.width - 400 * s) / 2, y: (size.height - 400 * s) / 2)
            c.scaleBy(x: s, y: s)
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
