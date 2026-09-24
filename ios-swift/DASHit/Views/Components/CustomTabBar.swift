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

/// Floating bottom navigation after the Blinkit reference: a frosted capsule
/// lifted off the screen edge, thin-line symbols, and for the active tab a
/// filled orange symbol that bounces while a soft highlight glides over to it.
struct CustomTabBar: View {
    @Binding var selectedTab: TabItem

    /// Height of the floating capsule.
    static let barHeight: CGFloat = 62
    /// Gap between the capsule and the home indicator.
    static let bottomGap: CGFloat = 4
    /// Everything the bar occupies above the bottom safe area.
    static let dockHeight: CGFloat = barHeight + bottomGap

    @Namespace private var selectionNamespace
    @State private var bounceCounts: [TabItem: Int] = [:]

    var body: some View {
        HStack(spacing: 2) {
            ForEach(TabItem.allCases, id: \.self) { tab in
                tabButton(tab)
            }
        }
        .padding(6)
        .frame(height: Self.barHeight)
        .background {
            ZStack {
                Capsule().fill(.ultraThinMaterial)
                Capsule().fill(Color.surfaceOverlay.opacity(0.62))
            }
        }
        .overlay(
            Capsule().strokeBorder(
                LinearGradient(colors: [Color.edgeHighlight, Color.hairline], startPoint: .top, endPoint: .bottom),
                lineWidth: 1
            )
        )
        .shadow(color: .floatingShadow, radius: 22, x: 0, y: 10)
        .padding(.horizontal, 24)
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
                    .font(.system(size: 20, weight: isSelected ? .regular : .light))
                    .symbolEffect(.bounce.up.byLayer, value: bounceCounts[tab, default: 0])
                    .frame(height: 24)
                Text(tab.rawValue)
                    .font(.system(size: 10.5, weight: isSelected ? .semibold : .regular))
                    .lineLimit(1)
            }
            .foregroundColor(isSelected ? .brandAccent : .textSecondary)
            .frame(maxWidth: .infinity)
            .frame(maxHeight: .infinity)
            .background {
                if isSelected {
                    Capsule()
                        .fill(Color.brandOrange.opacity(0.13))
                        .matchedGeometryEffect(id: "tab-selection", in: selectionNamespace)
                }
            }
            .contentShape(Capsule())
        }
        .buttonStyle(PressableButtonStyle(scale: 0.9))
        .accessibilityLabel(tab.rawValue)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}
