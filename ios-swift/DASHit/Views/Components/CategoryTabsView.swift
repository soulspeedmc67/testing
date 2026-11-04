import SwiftUI
import UIKit

/// Icon-over-label category tabs with a sliding orange underline, the native
/// counterpart of the web CategoryNavigationTabs. Sits under the pinned search.
struct CategoryTabsView: View {
    let categories: [Category]
    let selectedCategory: String?
    /// The spotlight tab's name, when the shop has one on (`Spotlight.tabId` when picked).
    var specialLabel: String? = nil
    let onSelect: (String?) -> Void

    @Namespace private var underlineNamespace

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(alignment: .bottom, spacing: 22) {
                tab(title: "All", symbol: "square.grid.2x2", isSelected: selectedCategory == nil) {
                    onSelect(nil)
                }
                if let specialLabel {
                    SpotlightTab(
                        title: specialLabel,
                        isSelected: selectedCategory == Spotlight.tabId,
                        namespace: underlineNamespace
                    ) {
                        onSelect(Spotlight.tabId)
                    }
                }
                ForEach(Array(categories.enumerated()), id: \.element.id) { index, category in
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

/// The spotlight's tab: a gold tile with a light sweeping across it and a soft
/// pulse, so it stands out from the plain aisles (the web's `cat.special`).
private struct SpotlightTab: View {
    let title: String
    let isSelected: Bool
    let namespace: Namespace.ID
    let action: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var sweep = false
    @State private var glow = false

    var body: some View {
        Button(action: action) {
            VStack(spacing: 5) {
                ZStack {
                    RoundedRectangle(cornerRadius: 9, style: .continuous)
                        .fill(SpotlightPalette.tabFill)
                        .overlay(
                            RoundedRectangle(cornerRadius: 9, style: .continuous)
                                .strokeBorder(Color.white.opacity(0.7), lineWidth: 0.8)
                        )
                    Image(systemName: "sparkles")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(SpotlightPalette.deepInk)
                    // The light sweeping across.
                    GeometryReader { geo in
                        LinearGradient(colors: [.clear, .white.opacity(0.85), .clear], startPoint: .leading, endPoint: .trailing)
                            .frame(width: geo.size.width * 0.5)
                            .rotationEffect(.degrees(18))
                            .offset(x: sweep ? geo.size.width * 1.4 : -geo.size.width * 0.8)
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
                    .allowsHitTesting(false)
                }
                .frame(width: 30, height: 24)
                .shadow(color: SpotlightPalette.glow.opacity(glow ? 0.75 : 0.35), radius: glow ? 7 : 3, y: 1)
                .scaleEffect(isSelected ? 1.08 : 1)

                Text(title)
                    .font(.system(size: 12, weight: .heavy))
                    .foregroundStyle(SpotlightPalette.labelGradient)
                    .lineLimit(1)
            }
            .padding(.top, 8)
            .padding(.bottom, 10)
            .overlay(alignment: .bottom) {
                if isSelected {
                    Capsule()
                        .fill(SpotlightPalette.gold)
                        .frame(height: 3)
                        .matchedGeometryEffect(id: "category-underline", in: namespace)
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(PressableButtonStyle(scale: 0.94))
        .accessibilityLabel("\(title), special collection")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 1.6).delay(0.4).repeatForever(autoreverses: false)) { sweep = true }
            withAnimation(.easeInOut(duration: 1.3).repeatForever(autoreverses: true)) { glow = true }
        }
    }
}
