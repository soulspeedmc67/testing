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

    var body: some View {
        Button(action: action) {
            VStack(spacing: 5) {
                // Driven by the clock, not by a repeat-forever animation: one of
                // those, started on appear in a scrolling list, can leak into
                // layout changes and make the tabs drift or jump.
                TimelineView(.animation(minimumInterval: 1 / 30, paused: reduceMotion)) { context in
                    let t = context.date.timeIntervalSinceReferenceDate
                    // The light crosses in the first 1.6 s of every 2.2 s.
                    let cycle = t.truncatingRemainder(dividingBy: 2.2) / 1.6
                    let sweep = reduceMotion ? -1 : min(cycle, 1)
                    let glow = reduceMotion ? 0.5 : (sin(t * 2 * .pi / 2.6) + 1) / 2
                    tile(sweep: sweep, glow: glow)
                }
                .frame(width: 30, height: 24)
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
    }

    /// The gold tile; `sweep` 0…1 is where the light is (below 0: none), `glow` 0…1 the pulse.
    private func tile(sweep: Double, glow: Double) -> some View {
        let shape = RoundedRectangle(cornerRadius: 9, style: .continuous)
        return ZStack {
            shape
                .fill(SpotlightPalette.tabFill)
                .overlay(shape.strokeBorder(Color.white.opacity(0.7), lineWidth: 0.8))
            Image(systemName: "sparkles")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(SpotlightPalette.deepInk)
            if sweep >= 0 {
                GeometryReader { geo in
                    LinearGradient(colors: [.clear, .white.opacity(0.85), .clear], startPoint: .leading, endPoint: .trailing)
                        .frame(width: geo.size.width * 0.5)
                        .rotationEffect(.degrees(18))
                        .offset(x: -geo.size.width * 0.8 + geo.size.width * 2.2 * sweep)
                }
                .allowsHitTesting(false)
            }
        }
        .clipShape(shape)
        .shadow(color: SpotlightPalette.glow.opacity(0.35 + 0.4 * glow), radius: 3 + 4 * glow, y: 1)
    }
}
