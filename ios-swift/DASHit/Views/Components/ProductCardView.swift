import SwiftUI

/// Dense product tile for the three-column grid and the category rails.
/// Tapping the tile opens the product sheet; the ADD / stepper sits on the
/// image corner so the price row keeps the full width.
struct ProductCardView: View {
    let product: Product
    var onOpen: () -> Void = {}
    var onRequestAgeConfirmation: () -> Void = {}

    @ObservedObject private var cart = CartViewModel.shared

    private var hasVariants: Bool { (product.variants?.count ?? 0) > 1 }
    private var tileShape: RoundedRectangle { RoundedRectangle(cornerRadius: 14, style: .continuous) }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            imageWell
                .overlay(alignment: .topLeading) { discountTag }
                .overlay(alignment: .topTrailing) { ageTag }
                .overlay(alignment: .bottomTrailing) {
                    QuantityStepper(
                        quantity: cart.quantity(for: product.id),
                        isEnabled: product.isAvailable,
                        onAdd: handleAdd,
                        onIncrement: handleIncrement,
                        onDecrement: { cart.decrementLatest(productId: product.id) }
                    )
                    .padding(5)
                }

            HStack(spacing: 5) {
                Text(product.unit)
                    .font(.system(size: 10.5, weight: .semibold))
                    .foregroundColor(.textSecondary)
                    .lineLimit(1)
                    .padding(.horizontal, 5)
                    .padding(.vertical, 2)
                    .background(Color.surfaceMuted, in: RoundedRectangle(cornerRadius: 4, style: .continuous))
                if hasVariants {
                    Text(product.options ?? "\(product.variants?.count ?? 0) options")
                        .font(.system(size: 10.5, weight: .medium))
                        .foregroundColor(.textMuted)
                        .lineLimit(1)
                }
            }

            Text(product.name)
                .font(.system(size: 12.5, weight: .semibold))
                .foregroundColor(.textPrimary)
                .lineLimit(2, reservesSpace: true)
                .multilineTextAlignment(.leading)

            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(CurrencyFormatter.format(product.price))
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundColor(.textPrimary)
                if let original = product.originalPrice, original > product.price {
                    Text(CurrencyFormatter.format(original))
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.textFaint)
                        .strikethrough(true, color: .textFaint)
                }
            }
            .lineLimit(1)
            .minimumScaleFactor(0.8)
        }
        .padding(8)
        .dashitCard(tileShape)
        .contentShape(tileShape)
        .onTapGesture(perform: onOpen)
        .accessibilityElement(children: .contain)
        .accessibilityAddTraits(.isButton)
    }

    // MARK: - Pieces

    private var imageWell: some View {
        Color.surfaceMuted
            .aspectRatio(1, contentMode: .fit)
            .overlay {
                AsyncImage(url: URL(string: product.img), transaction: Transaction(animation: .easeOut(duration: 0.2))) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                    case .failure:
                        Image(systemName: "photo")
                            .font(.system(size: 20))
                            .foregroundColor(.textFaint)
                    default:
                        ShimmerView()
                    }
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .opacity(product.isAvailable ? 1 : 0.45)
    }

    @ViewBuilder
    private var discountTag: some View {
        if let percent = product.discountPercent, percent > 0 {
            Text("\(percent)% OFF")
                .font(.system(size: 9, weight: .heavy))
                .foregroundColor(.white)
                .padding(.horizontal, 5)
                .padding(.vertical, 3)
                .background(Color.brandOrange, in: RoundedRectangle(cornerRadius: 5, style: .continuous))
                .padding(5)
        }
    }

    @ViewBuilder
    private var ageTag: some View {
        if product.ageRestricted == true {
            Text("18+")
                .font(.system(size: 9, weight: .heavy))
                .foregroundColor(.white)
                .padding(.horizontal, 5)
                .padding(.vertical, 3)
                .background(Color.black.opacity(0.7), in: RoundedRectangle(cornerRadius: 5, style: .continuous))
                .padding(5)
                .accessibilityLabel("Age restricted, 18 and over")
        }
    }

    // MARK: - Actions

    private func handleAdd() {
        if hasVariants {
            onOpen()
        } else if cart.requiresAgeConfirmation(for: product) {
            onRequestAgeConfirmation()
        } else {
            cart.add(product: product)
        }
    }

    /// With several sizes in the cart, "+" asks which size to add.
    private func handleIncrement() {
        if hasVariants {
            onOpen()
        } else {
            cart.add(product: product)
        }
    }
}
