import SwiftUI

enum TabItem: String, CaseIterable {
    case home = "Home"
    case orderAgain = "Order Again"
    case categories = "Categories"

    var iconName: String {
        switch self {
        case .home: return "house.fill"
        case .orderAgain: return "bag.fill"
        case .categories: return "square.grid.2x2.fill"
        }
    }

    var outlineIconName: String {
        switch self {
        case .home: return "house"
        case .orderAgain: return "bag"
        case .categories: return "square.grid.2x2"
        }
    }
}

/// Floating bottom navigation: a rounded bar inset from the screen edges,
/// on a material so content shows softly through as it scrolls beneath.
/// The active tab gets a filled orange symbol that bounces on selection.
struct CustomTabBar: View {
    @Binding var selectedTab: TabItem

    /// Height of the floating bar itself.
    static let barHeight: CGFloat = 62
    /// Gap between the bar and the bottom safe area (home indicator).
    static let bottomGap: CGFloat = 6
    /// Everything the bar occupies above the bottom safe area.
    static let dockHeight: CGFloat = barHeight + bottomGap

    @State private var bounceCounts: [TabItem: Int] = [:]

    private var barShape: RoundedRectangle { RoundedRectangle(cornerRadius: 26, style: .continuous) }

    var body: some View {
        HStack(spacing: 0) {
            ForEach(TabItem.allCases, id: \.self) { tab in
                tabButton(tab)
            }
        }
        .padding(.horizontal, 6)
        .frame(height: Self.barHeight)
        .background(.regularMaterial, in: barShape)
        .overlay(barShape.strokeBorder(Color.hairline, lineWidth: 1))
        .shadow(color: .floatingShadow, radius: 20, x: 0, y: 8)
        .padding(.horizontal, 20)
        .padding(.bottom, Self.bottomGap)
        .animation(.dashitSpring, value: selectedTab)
    }

    private func tabButton(_ tab: TabItem) -> some View {
        let isSelected = tab == selectedTab

        return Button {
            guard !isSelected else { return }
            HapticsManager.shared.selection()
            bounceCounts[tab, default: 0] += 1
            selectedTab = tab
        } label: {
            VStack(spacing: 3) {
                Image(systemName: isSelected ? tab.iconName : tab.outlineIconName)
                    .font(.system(size: 20, weight: isSelected ? .semibold : .regular))
                    .foregroundColor(isSelected ? .brandAccent : .textMuted)
                    .symbolEffect(.bounce, value: bounceCounts[tab, default: 0])
                    .frame(height: 24)
                Text(tab.rawValue)
                    .font(.system(size: 11, weight: isSelected ? .bold : .medium))
                    .foregroundColor(isSelected ? .textPrimary : .textMuted)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity)
            .frame(height: Self.barHeight)
            .contentShape(Rectangle())
        }
        .buttonStyle(PressableButtonStyle(scale: 0.9))
        .accessibilityLabel(tab.rawValue)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}
