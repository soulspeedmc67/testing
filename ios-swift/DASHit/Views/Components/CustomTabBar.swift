import SwiftUI

enum TabItem: String, CaseIterable {
    case home = "Home"
    case categories = "Categories"
    case orders = "Orders"
    case profile = "Profile"

    var iconName: String {
        switch self {
        case .home: return "house.fill"
        case .categories: return "square.grid.2x2.fill"
        case .orders: return "bag.fill"
        case .profile: return "person.fill"
        }
    }

    var outlineIconName: String {
        switch self {
        case .home: return "house"
        case .categories: return "square.grid.2x2"
        case .orders: return "bag"
        case .profile: return "person"
        }
    }
}

/// Bottom navigation. The active tab gets a filled orange symbol that bounces
/// on selection; the bar's surface runs under the home indicator.
struct CustomTabBar: View {
    @Binding var selectedTab: TabItem

    /// Height of the bar above the bottom safe area.
    static let barHeight: CGFloat = 58

    @State private var bounceCounts: [TabItem: Int] = [:]

    var body: some View {
        HStack(spacing: 0) {
            ForEach(TabItem.allCases, id: \.self) { tab in
                tabButton(tab)
            }
        }
        .animation(.dashitSpring, value: selectedTab)
        .background(Color.surfaceRaised.ignoresSafeArea(edges: .bottom))
        .overlay(alignment: .top) {
            Rectangle()
                .fill(Color.hairline)
                .frame(height: 1)
        }
    }

    private func tabButton(_ tab: TabItem) -> some View {
        let isSelected = tab == selectedTab

        return Button {
            guard !isSelected else { return }
            HapticsManager.shared.selection()
            bounceCounts[tab, default: 0] += 1
            selectedTab = tab
        } label: {
            VStack(spacing: 4) {
                Image(systemName: isSelected ? tab.iconName : tab.outlineIconName)
                    .font(.system(size: 21, weight: isSelected ? .semibold : .regular))
                    .foregroundColor(isSelected ? .brandAccent : .textMuted)
                    .symbolEffect(.bounce, value: bounceCounts[tab, default: 0])
                    .frame(height: 24)
                Text(tab.rawValue)
                    .font(.system(size: 11, weight: isSelected ? .bold : .medium))
                    .foregroundColor(isSelected ? .textPrimary : .textMuted)
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
