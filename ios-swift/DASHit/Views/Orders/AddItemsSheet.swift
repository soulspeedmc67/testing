import SwiftUI

/// "Add to your order" during the 60-second change window: a quick catalogue
/// (search, aisle chips, compact rows). The picks are merged into the order by
/// `OrderUpdater`; after the window they can go to the cart instead.
struct AddItemsSheet: View {
    let order: Order
    var onUpdated: (Order) -> Void = { _ in }

    @Environment(\.dismiss) private var dismiss
    @StateObject private var catalogue = StorefrontViewModel()
    @ObservedObject private var activeOrder = ActiveOrderStore.shared
    @ObservedObject private var cart = CartViewModel.shared
    @State private var additions: [String: Int] = [:]
    @State private var query = ""
    @State private var aisle: String? = nil
    @State private var isSaving = false
    @State private var errorMessage: String? = nil

    /// The live copy when this is the active order, so the store moving it on
    /// closes the window here as well.
    private var liveOrder: Order {
        if let current = activeOrder.order, current.id == order.id { return current }
        return order
    }

    private var allLines: [AddableLine] {
        catalogue.products
            .filter { $0.isAvailable && $0.ageRestricted != true }
            .flatMap { AddableLine.lines(for: $0) }
    }

    private var visibleLines: [AddableLine] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        return allLines.filter { line in
            (aisle == nil || line.product.cat.caseInsensitiveCompare(aisle ?? "") == .orderedSame)
                && (q.isEmpty || line.name.lowercased().contains(q) || line.product.cat.lowercased().contains(q))
        }
    }

    private var pickedItems: [CartItem] {
        allLines.compactMap { line in
            let qty = additions[line.id, default: 0]
            return qty > 0 ? line.cartItem(qty: qty) : nil
        }
    }

    private var addedCount: Int { additions.values.reduce(0, +) }

    private var newBill: CartBillBreakdown {
        var items = liveOrder.items
        for pick in pickedItems {
            if let index = items.firstIndex(where: { $0.id == pick.id }) {
                items[index].qty += pick.qty
            } else {
                items.append(pick)
            }
        }
        return CartBillBreakdown.calculate(
            items: items,
            appliedCoupon: liveOrder.couponCode.flatMap { Coupon.find(code: $0) }
        )
    }

    var body: some View {
        VStack(spacing: 0) {
            header
            aisleChips
            ScrollView {
                LazyVStack(spacing: 0) {
                    ForEach(Array(visibleLines.enumerated()), id: \.element.id) { index, line in
                        if index > 0 {
                            Rectangle()
                                .fill(Color.hairline)
                                .frame(height: 1)
                                .padding(.leading, 64)
                        }
                        row(line)
                    }
                    if catalogue.isLoading && catalogue.products.isEmpty {
                        VStack(spacing: 18) {
                            ForEach(0..<6, id: \.self) { _ in
                                HStack(spacing: 12) {
                                    SkeletonBlock(width: 52, height: 52, cornerRadius: 10)
                                    VStack(alignment: .leading, spacing: 7) {
                                        SkeletonBlock(width: 150, height: 12)
                                        SkeletonBlock(width: 90, height: 10)
                                    }
                                    Spacer()
                                    SkeletonBlock(width: 72, height: 32, cornerRadius: 10)
                                }
                            }
                        }
                        .padding(.vertical, 12)
                        .shimmering()
                    } else if visibleLines.isEmpty {
                        Text("Nothing matches “\(query)”")
                            .font(.system(size: 14))
                            .foregroundColor(.textMuted)
                            .padding(.vertical, 40)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 12)
            }
            .scrollDismissesKeyboard(.immediately)
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            bottomBar
        }
        .background(Color.surface.ignoresSafeArea())
        .dashitSheet([.large])
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Add to your order")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(.textPrimary)
                    Text("Everything arrives together, with the same delivery code.")
                        .font(.system(size: 13))
                        .foregroundColor(.textMuted)
                }
                Spacer(minLength: 8)
                ModifyCountdownBadge(order: liveOrder)
                    .padding(.horizontal, 10)
                    .frame(height: 30)
                    .background(Color.caution.opacity(0.14), in: Capsule())
            }

            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(.textMuted)
                TextField("", text: $query, prompt: Text("Search milk, bread, eggs…").foregroundColor(.textFaint))
                    .font(.system(size: 15))
                    .foregroundColor(.textPrimary)
                    .tint(.brandOrange)
                    .autocorrectionDisabled()
                    .submitLabel(.search)
            }
            .padding(.horizontal, 12)
            .frame(height: 44)
            .dashitCard(cornerRadius: 12)
        }
        .padding(.horizontal, 16)
        .padding(.top, 22)
        .padding(.bottom, 10)
    }

    private var aisleChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                chip("All", isSelected: aisle == nil) { aisle = nil }
                ForEach(catalogue.categories) { category in
                    chip(category.name, isSelected: aisle == category.name) { aisle = category.name }
                }
            }
            .padding(.horizontal, 16)
        }
        .padding(.bottom, 6)
    }

    private func chip(_ title: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button {
            HapticsManager.shared.selection()
            withAnimation(.dashitSpring) { action() }
        } label: {
            Text(title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(isSelected ? .white : .textSecondary)
                .padding(.horizontal, 14)
                .frame(height: 32)
                .background(isSelected ? Color.brandOrange : Color.surfaceMuted, in: Capsule())
        }
        .buttonStyle(.pressable)
    }

    // MARK: - Rows

    private func row(_ line: AddableLine) -> some View {
        let qty = additions[line.id, default: 0]
        let inOrder = liveOrder.items.first(where: { $0.id == line.id })?.qty ?? 0

        return HStack(spacing: 12) {
            Color.surfaceMuted
                .frame(width: 52, height: 52)
                .overlay {
                    AsyncImage(url: URL(string: line.product.img)) { phase in
                        if let image = phase.image {
                            image.resizable().scaledToFill()
                        } else if phase.error == nil && !line.product.img.isEmpty {
                            ShimmerView()
                        } else {
                            Color.surfaceMuted
                        }
                    }
                }
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

            VStack(alignment: .leading, spacing: 3) {
                Text(line.name)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.textPrimary)
                    .lineLimit(2)
                HStack(spacing: 6) {
                    Text(line.unit)
                        .foregroundColor(.textMuted)
                    if inOrder > 0 {
                        Text("· \(inOrder) in order")
                            .foregroundColor(.positive)
                    }
                }
                .font(.system(size: 12, weight: .medium))
                Text(CurrencyFormatter.format(line.price))
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundColor(.textPrimary)
            }

            Spacer(minLength: 8)

            QuantityStepper(
                quantity: qty,
                onAdd: { change(line, by: 1) },
                onIncrement: { change(line, by: 1) },
                onDecrement: { change(line, by: -1) }
            )
        }
        .padding(.vertical, 10)
    }

    private func change(_ line: AddableLine, by delta: Int) {
        let current = additions[line.id, default: 0]
        if delta > 0, let stock = line.product.stock {
            let inOrder = liveOrder.items.first(where: { $0.id == line.id })?.qty ?? 0
            guard inOrder + current < stock else {
                HapticsManager.shared.warning()
                return
            }
        }
        let next = max(0, current + delta)
        additions[line.id] = next == 0 ? nil : next
        if delta > 0 && current == 0 {
            HapticsManager.shared.addToCart()
        } else {
            HapticsManager.shared.tick()
        }
    }

    // MARK: - Bottom bar

    private var bottomBar: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            let isOpen = liveOrder.modifySecondsRemaining(at: context.date) > 0

            VStack(alignment: .leading, spacing: 10) {
                if let errorMessage {
                    Label(errorMessage, systemImage: "exclamationmark.circle.fill")
                        .font(.system(size: 12.5, weight: .medium))
                        .foregroundColor(.danger)
                        .fixedSize(horizontal: false, vertical: true)
                } else if !isOpen {
                    Text("The 60 seconds are up and the store is packing your order. You can still order these separately.")
                        .font(.system(size: 12.5))
                        .foregroundColor(.textMuted)
                        .fixedSize(horizontal: false, vertical: true)
                }

                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(addedCount == 0 ? "Nothing added yet" : "\(addedCount) item\(addedCount == 1 ? "" : "s") added")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.textPrimary)
                        Text(addedCount == 0
                             ? "Order total \(CurrencyFormatter.format(liveOrder.grandTotal))"
                             : "New total \(CurrencyFormatter.format(newBill.grandTotal))")
                            .font(.system(size: 12))
                            .foregroundColor(.textMuted)
                            .contentTransition(.numericText())
                    }
                    Spacer(minLength: 8)
                    if isOpen {
                        Button(action: save) {
                            HStack(spacing: 8) {
                                if isSaving {
                                    ProgressView()
                                        .tint(.white)
                                }
                                Text(isSaving ? "Updating…" : "Update order")
                                    .font(.system(size: 15, weight: .bold))
                            }
                            .foregroundColor(addedCount > 0 ? .white : .textFaint)
                            .padding(.horizontal, 20)
                            .frame(height: 48)
                            .background(addedCount > 0 ? Color.brandOrange : Color.surfaceMuted, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        }
                        .buttonStyle(.pressable)
                        .disabled(addedCount == 0 || isSaving)
                    } else {
                        Button(action: moveToCart) {
                            Text("Add to cart instead")
                                .font(.system(size: 15, weight: .bold))
                                .foregroundColor(addedCount > 0 ? .white : .textFaint)
                                .padding(.horizontal, 18)
                                .frame(height: 48)
                                .background(addedCount > 0 ? Color.brandOrange : Color.surfaceMuted, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        }
                        .buttonStyle(.pressable)
                        .disabled(addedCount == 0)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
            .padding(.bottom, 8)
            .background(
                Color.surfaceOverlay
                    .overlay(alignment: .top) {
                        Rectangle().fill(Color.hairline).frame(height: 1)
                    }
                    .ignoresSafeArea(edges: .bottom)
            )
            .animation(.dashitSpring, value: addedCount)
        }
    }

    // MARK: - Actions

    private func save() {
        guard !isSaving else { return }
        isSaving = true
        errorMessage = nil
        let picks = pickedItems
        let target = liveOrder
        Task {
            do {
                let updated = try await OrderUpdater.addItems(picks, to: target)
                ActiveOrderStore.shared.adoptReplacement(updated)
                HapticsManager.shared.success()
                onUpdated(updated)
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
                HapticsManager.shared.error()
            }
            isSaving = false
        }
    }

    private func moveToCart() {
        cart.reorder(pickedItems)
        dismiss()
    }
}

/// One addable line: a product, or one size of a product with several.
struct AddableLine: Identifiable {
    /// The cart line id: the variant's id, or the product's for a single size.
    let id: String
    let product: Product
    let variant: ProductVariant?

    var name: String { product.name }
    var unit: String { variant?.unit ?? product.unit }
    var price: Double { variant?.price ?? product.price }
    var originalPrice: Double? { variant == nil ? product.originalPrice : variant?.originalPrice }

    static func lines(for product: Product) -> [AddableLine] {
        let variants = product.variants ?? []
        guard variants.count > 1 else {
            return [AddableLine(id: product.id, product: product, variant: nil)]
        }
        return variants.map { AddableLine(id: $0.id, product: product, variant: $0) }
    }

    func cartItem(qty: Int) -> CartItem {
        CartItem(
            id: id,
            productId: product.id,
            name: product.name,
            unit: unit,
            price: price,
            originalPrice: originalPrice,
            img: product.img,
            cat: product.cat,
            qty: qty,
            maxQuantity: product.stock
        )
    }
}

/// "0:43" beside a draining ring: the time left to add items or cancel.
struct ModifyCountdownBadge: View {
    let order: Order

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            let seconds = order.modifySecondsRemaining(at: context.date)
            HStack(spacing: 6) {
                ZStack {
                    Circle()
                        .stroke(Color.caution.opacity(0.25), lineWidth: 2.5)
                    Circle()
                        .trim(from: 0, to: CGFloat(Double(seconds) / Order.modifyWindowSeconds))
                        .stroke(Color.caution, style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                }
                .frame(width: 15, height: 15)
                Text(String(format: "0:%02d", seconds))
                    .font(.system(size: 13, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .contentTransition(.numericText(countsDown: true))
            }
            .foregroundColor(.caution)
            .animation(.linear(duration: 0.9), value: seconds)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("\(seconds) seconds left to change this order")
        }
    }
}
