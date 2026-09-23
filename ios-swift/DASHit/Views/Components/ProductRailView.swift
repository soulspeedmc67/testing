import SwiftUI

/// "Everyday" rail: one category as a snapping horizontal row of product tiles.
struct ProductRailView: View {
    let title: String
    let products: [Product]
    var onSeeAll: () -> Void
    var onOpen: (Product) -> Void
    var onRequestAgeConfirmation: (Product) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline) {
                Text(title)
                    .font(.system(size: 17, weight: .bold))
                    .foregroundColor(.textPrimary)
                Spacer()
                Button(action: onSeeAll) {
                    HStack(spacing: 2) {
                        Text("See all")
                        Image(systemName: "chevron.right")
                            .font(.system(size: 11, weight: .bold))
                    }
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.brandAccent)
                    .padding(.vertical, 6)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.pressable)
                .accessibilityLabel("See all \(title)")
            }
            .padding(.horizontal, 16)

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(alignment: .top, spacing: 10) {
                    ForEach(products) { product in
                        ProductCardView(
                            product: product,
                            onOpen: { onOpen(product) },
                            onRequestAgeConfirmation: { onRequestAgeConfirmation(product) }
                        )
                        .frame(width: 128)
                    }
                }
                .scrollTargetLayout()
            }
            .contentMargins(.horizontal, 16, for: .scrollContent)
            .scrollTargetBehavior(.viewAligned)
        }
    }
}
