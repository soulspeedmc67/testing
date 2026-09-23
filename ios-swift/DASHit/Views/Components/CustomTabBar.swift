import SwiftUI

enum TabItem: String, CaseIterable {
    case home = "Home"
    case orderAgain = "Order Again"
    case categories = "Categories"

    var iconName: String {
        switch self {
        case .home: return "house.fill"
        case .orderAgain: return "bag.fill"
        case .categories: return "circle.grid.2x2.fill"
        }
    }

    var outlineIconName: String {
        switch self {
        case .home: return "house"
        case .orderAgain: return "bag"
        case .categories: return "circle.grid.2x2"
        }
    }
}

/// Bottom navigation, after the Blinkit reference: a full-width translucent
/// bar the feed scrolls beneath, large symbols over short labels, and the
/// active tab picked out in brand orange with a filled, bouncing symbol.
struct CustomTabBar: View {
    @Binding var selectedTab: TabItem

    /// Height of the bar above the bottom safe area.
    static let barHeight: CGFloat = 64
    /// Everything the bar occupies above the bottom safe area.
    static let dockHeight: CGFloat = barHeight

    @State private var bounceCounts: [TabItem: Int] = [:]

    var body: some View {
        HStack(spacing: 0) {
            ForEach(TabItem.allCases, id: \.self) { tab in
                tabButton(tab)
            }
        }
        .padding(.horizontal, 12)
        .frame(height: Self.barHeight)
        .background {
            // Frosted, and tinted towards the page so it reads as one surface
            // while cards stay faintly visible as they pass underneath.
            ZStack {
                Rectangle().fill(.ultraThinMaterial)
                Color.surface.opacity(0.72)
            }
            .ignoresSafeArea(edges: .bottom)
        }
        .overlay(alignment: .top) {
            Rectangle()
                .fill(Color.hairline.opacity(0.7))
                .frame(height: 0.5)
        }
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
            VStack(spacing: 5) {
                Image(systemName: isSelected ? tab.iconName : tab.outlineIconName)
                    .symbolRenderingMode(.hierarchical)
                    .font(.system(size: 24, weight: isSelected ? .semibold : .regular))
                    .foregroundColor(isSelected ? .brandAccent : .textSecondary)
                    .symbolEffect(.bounce, value: bounceCounts[tab, default: 0])
                    .frame(height: 28)
                Text(tab.rawValue)
                    .font(.system(size: 12.5, weight: isSelected ? .bold : .medium))
                    .foregroundColor(isSelected ? .textPrimary : .textSecondary)
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
