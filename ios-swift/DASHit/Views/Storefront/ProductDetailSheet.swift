import SwiftUI

/// Product sheet: image, price, size selector, statutory notice for 18+ items,
/// nutrition callouts when the product carries them, and a sticky add bar.
struct ProductDetailSheet: View {
    let product: Product

    @ObservedObject private var cart = CartViewModel.shared
    @State private var selectedVariantID: String? = nil
    @State private var isAgeGatePresented = false

    /// Only products with a real choice of size get a selector; a lone variant is
    /// treated as the product itself so the card and the sheet share one cart line.
    private var variants: [ProductVariant] {
        let all = product.variants ?? []
        return all.count > 1 ? all : []
    }
    private var selectedVariant: ProductVariant? {
        variants.first(where: { $0.id == selectedVariantID }) ?? variants.first
    }
    private var price: Double { selectedVariant?.price ?? product.price }
    private var originalPrice: Double? {
        selectedVariant == nil ? product.originalPrice : selectedVariant?.originalPrice
    }
    private var unit: String { selectedVariant?.unit ?? product.unit }
    private var lineId: String { selectedVariant?.id ?? product.id }
    private var discountPercent: Int? {
        guard let original = originalPrice, original > price else { return nil }
        return Int(((original - price) / original * 100).rounded())
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                heroImage
                titleBlock
                    .padding(.top, 18)
                priceBlock
                    .padding(.top, 12)
                if !variants.isEmpty {
                    variantPicker
                        .padding(.top, 22)
                }
                if product.ageRestricted == true {
                    statutoryNotice
                        .padding(.top, 20)
                }
                if let facts = product.nutrition, !facts.isEmpty {
                    nutritionCallouts(facts)
                        .padding(.top, 22)
                }
                detailsList
                    .padding(.top, 22)
            }
            .padding(.horizontal, 20)
            .padding(.top, 20)
            .padding(.bottom, 24)
            .animation(.dashitSpring, value: selectedVariantID)
        }
        .scrollIndicators(.hidden)
        .safeAreaInset(edge: .bottom, spacing: 0) {
            purchaseBar
        }
        .sheet(isPresented: $isAgeGatePresented) {
            AgeGateSheet(product: product) {
                cart.confirmAge()
                cart.add(product: product, variant: selectedVariant)
            }
        }
        .dashitSheet([.medium, .fraction(0.85)])
    }

    // MARK: - Sections

    private var heroImage: some View {
        Color.surfaceRaised
            .frame(height: 220)
            .overlay {
                AsyncImage(url: URL(string: product.img), transaction: Transaction(animation: .easeOut(duration: 0.25))) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                    case .failure:
                        Image(systemName: "photo")
                            .font(.system(size: 28))
                            .foregroundColor(.textFaint)
                    default:
                        ShimmerView()
                    }
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
            .overlay(alignment: .topLeading) {
                if !product.isAvailable {
                    Text("Out of stock")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.black.opacity(0.7), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                        .padding(10)
                }
            }
    }

    private var titleBlock: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Text(product.cat.uppercased())
                    .font(.system(size: 11, weight: .bold))
                    .tracking(0.8)
                    .foregroundColor(.brandAccent)
                if let time = product.time {
                    Text("·")
                        .foregroundColor(.textFaint)
                    Label(time, systemImage: "clock")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.textMuted)
                        .labelStyle(.titleAndIcon)
                }
            }

            Text(product.name)
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(.textPrimary)
                .fixedSize(horizontal: false, vertical: true)

            if let rating = product.rating {
                HStack(spacing: 4) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 11))
                        .foregroundColor(.caution)
                    Text(rating)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.textSecondary)
                    if let count = product.ratingCount {
                        Text("(\(count) ratings)")
                            .font(.system(size: 12))
                            .foregroundColor(.textMuted)
                    }
                }
            }
        }
    }

    private var priceBlock: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(CurrencyFormatter.format(price))
                    .font(.system(size: 26, weight: .bold, design: .rounded))
                    .foregroundColor(.textPrimary)
                    .contentTransition(.numericText(value: price))
                if let original = originalPrice, original > price {
                    Text("MRP \(CurrencyFormatter.format(original))")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.textFaint)
                        .strikethrough(true, color: .textFaint)
                }
                if let percent = discountPercent {
                    Text("\(percent)% off")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.positive)
                }
            }
            Text("\(unit) · Inclusive of all taxes")
                .font(.system(size: 12))
                .foregroundColor(.textMuted)
        }
    }

    private var variantPicker: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Select unit")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.textPrimary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(variants) { variant in
                        variantOption(variant)
                    }
                }
                .padding(.vertical, 2)
            }
            .scrollClipDisabled()
        }
    }

    private func variantOption(_ variant: ProductVariant) -> some View {
        let isSelected = variant.id == selectedVariant?.id
        let shape = RoundedRectangle(cornerRadius: 14, style: .continuous)

        return Button {
            guard !isSelected else { return }
            HapticsManager.shared.selection()
            selectedVariantID = variant.id
        } label: {
            VStack(alignment: .leading, spacing: 4) {
                Text(variant.unit)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.textPrimary)
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text(CurrencyFormatter.format(variant.price))
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                        .foregroundColor(isSelected ? .brandAccent : .textSecondary)
                    if let original = variant.originalPrice, original > variant.price {
                        Text(CurrencyFormatter.format(original))
                            .font(.system(size: 11))
                            .foregroundColor(.textFaint)
                            .strikethrough(true, color: .textFaint)
                    }
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .frame(minWidth: 100, alignment: .leading)
            .background(Color.surfaceRaised, in: shape)
            .overlay(shape.strokeBorder(isSelected ? Color.brandOrange : Color.hairline, lineWidth: isSelected ? 1.5 : 1))
            .contentShape(shape)
        }
        .buttonStyle(.pressable)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    private var statutoryNotice: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 15))
                .foregroundColor(.caution)
            VStack(alignment: .leading, spacing: 3) {
                Text("18+ only · Statutory warning")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.textPrimary)
                Text(statutoryCopy)
                    .font(.system(size: 12))
                    .foregroundColor(.textMuted)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        .padding(14)
        .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(Color.hairline, lineWidth: 1))
    }

    private var statutoryCopy: String {
        if product.cat.caseInsensitiveCompare("Tobacco") == .orderedSame {
            return "Tobacco causes cancer. Sale of tobacco products to a person under the age of 18 years is a punishable offence. A government photo ID is checked at delivery."
        }
        return "Sold only to customers aged \(product.minAge ?? 18) and above. A government photo ID is checked at delivery."
    }

    private func nutritionCallouts(_ facts: [NutritionFact]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Nutrition")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.textPrimary)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 4), spacing: 8) {
                ForEach(facts, id: \.self) { fact in
                    VStack(spacing: 3) {
                        Text(fact.value)
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundColor(.textPrimary)
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                        Text(fact.label)
                            .font(.system(size: 10.5, weight: .medium))
                            .foregroundColor(.textMuted)
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Color.hairline, lineWidth: 1))
                }
            }
        }
    }

    private var detailsList: some View {
        VStack(spacing: 0) {
            detailRow("Net quantity", value: unit)
            Rectangle().fill(Color.hairline).frame(height: 1)
            detailRow("Category", value: product.cat)
            Rectangle().fill(Color.hairline).frame(height: 1)
            detailRow("Sold by", value: "DASHit Express Hub, Anantnag")
        }
        .padding(.horizontal, 14)
        .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(Color.hairline, lineWidth: 1))
    }

    private func detailRow(_ label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 13))
                .foregroundColor(.textMuted)
            Spacer(minLength: 12)
            Text(value)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(.textPrimary)
                .multilineTextAlignment(.trailing)
        }
        .padding(.vertical, 12)
    }

    // MARK: - Purchase bar

    private var purchaseBar: some View {
        let quantity = cart.quantity(forItemId: lineId)

        return HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 1) {
                Text(CurrencyFormatter.format(price))
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundColor(.textPrimary)
                    .contentTransition(.numericText(value: price))
                Text(unit)
                    .font(.system(size: 12))
                    .foregroundColor(.textMuted)
                    .lineLimit(1)
            }

            Spacer(minLength: 8)

            if quantity == 0 {
                Button(action: handleAdd) {
                    Text(product.isAvailable ? "Add to cart" : "Out of stock")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(product.isAvailable ? .white : .textFaint)
                        .frame(width: 168, height: 50)
                        .background(product.isAvailable ? Color.brandOrange : Color.surfaceMuted, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.pressable)
                .disabled(!product.isAvailable)
                .transition(.scale(scale: 0.9).combined(with: .opacity))
            } else {
                QuantityStepper(
                    quantity: quantity,
                    size: .regular,
                    onAdd: handleAdd,
                    onIncrement: { cart.increment(itemId: lineId) },
                    onDecrement: { cart.decrement(itemId: lineId) }
                )
                .transition(.scale(scale: 0.9).combined(with: .opacity))
            }
        }
        .animation(.dashitSpring, value: quantity == 0)
        .animation(.dashitSpring, value: price)
        .padding(.horizontal, 20)
        .padding(.top, 12)
        .padding(.bottom, 8)
        .background(
            Color.surfaceRaised
                .overlay(alignment: .top) {
                    Rectangle().fill(Color.hairline).frame(height: 1)
                }
                .ignoresSafeArea(edges: .bottom)
        )
    }

    private func handleAdd() {
        guard product.isAvailable else { return }
        if cart.requiresAgeConfirmation(for: product) {
            isAgeGatePresented = true
        } else {
            cart.add(product: product, variant: selectedVariant)
        }
    }
}
