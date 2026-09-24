import SwiftUI
import UIKit

/// Icon-over-label category tabs with a sliding orange underline, the native
/// counterpart of the web CategoryNavigationTabs. Sits under the pinned search.
struct CategoryTabsView: View {
    let categories: [Category]
    let selectedCategory: String?
    let onSelect: (String?) -> Void

    @Namespace private var underlineNamespace

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(alignment: .bottom, spacing: 22) {
                tab(title: "All", symbol: "square.grid.2x2", isSelected: selectedCategory == nil) {
                    onSelect(nil)
                }
                ForEach(categories) { category in
                    tab(
                        title: category.name,
                        symbol: CategorySymbol.name(for: category),
                        isSelected: selectedCategory == category.name
                    ) {
                        onSelect(category.name)
                    }
                }
            }
            .padding(.horizontal, 16)
        }
        .animation(.dashitSpring, value: selectedCategory)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Color.hairline)
                .frame(height: 1)
        }
    }

    private func tab(title: String, symbol: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 5) {
                Image(systemName: symbol)
                    .symbolVariant(isSelected ? .fill : .none)
                    .font(.system(size: 21, weight: isSelected ? .regular : .light))
                    .foregroundColor(isSelected ? .brandAccent : .textMuted)
                    .frame(height: 24)
                Text(title)
                    .font(.system(size: 12, weight: isSelected ? .bold : .medium))
                    .foregroundColor(isSelected ? .textPrimary : .textMuted)
                    .lineLimit(1)
            }
            .padding(.top, 8)
            .padding(.bottom, 10)
            .overlay(alignment: .bottom) {
                if isSelected {
                    Capsule()
                        .fill(Color.brandOrange)
                        .frame(height: 3)
                        .matchedGeometryEffect(id: "category-underline", in: underlineNamespace)
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(PressableButtonStyle(scale: 0.94))
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

/// Picks an SF Symbol for a category. Firestore categories may carry icon
/// names from the web (lucide) that SF Symbols does not have, so the stored
/// name is only used when it resolves; otherwise the category name decides.
enum CategorySymbol {
    static func name(for category: Category) -> String {
        if let icon = category.icon {
            let base = icon.hasSuffix(".fill") ? String(icon.dropLast(5)) : icon
            if UIImage(systemName: base) != nil {
                return base
            }
        }

        let name = category.name.lowercased()
        let candidates: [(keys: [String], symbol: String)] = [
            (["dairy", "milk", "egg"], "cup.and.saucer"),
            (["snack", "namkeen", "chips"], "popcorn"),
            (["fruit"], "leaf"),
            (["vegetable"], "carrot"),
            (["bakery", "bread", "cake"], "birthday.cake"),
            (["drink", "juice", "beverage"], "waterbottle"),
            (["chicken", "meat", "fish"], "fork.knife"),
            (["kitchen"], "frying.pan"),
            (["home", "clean"], "house"),
            (["grocery", "atta", "rice", "staple"], "basket"),
            (["biscuit", "cookie"], "birthday.cake"),
            (["instant", "noodle", "ready"], "takeoutbag.and.cup.and.straw"),
            (["spice", "masala"], "flame"),
            (["sweet", "chocolate"], "gift")
        ]
        for candidate in candidates where candidate.keys.contains(where: { name.contains($0) }) {
            if UIImage(systemName: candidate.symbol) != nil {
                return candidate.symbol
            }
        }
        return "bag"
    }
}
