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

/// Bottom navigation. The indicator glides between tabs, the new tab's symbol
/// bounces, and the bar's surface runs under the home indicator.
struct CustomTabBar: View {
    @Binding var selectedTab: TabItem

    /// Height of the bar above the bottom safe area.
    static let barHeight: CGFloat = 56

    @Namespace private var indicatorNamespace
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
                    .font(.system(size: 19, weight: .semibold))
                    .symbolEffect(.bounce, value: bounceCounts[tab, default: 0])
                    .frame(height: 22)
                Text(tab.rawValue)
                    .font(.system(size: 10, weight: .semibold))
            }
            .foregroundColor(isSelected ? .brandAccent : .textMuted)
            .frame(maxWidth: .infinity)
            .frame(height: Self.barHeight)
            .overlay(alignment: .top) {
                if isSelected {
                    Capsule()
                        .fill(Color.brandOrange)
                        .frame(width: 24, height: 3)
                        .matchedGeometryEffect(id: "tab-indicator", in: indicatorNamespace)
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(PressableButtonStyle(scale: 0.9))
        .accessibilityLabel(tab.rawValue)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}
