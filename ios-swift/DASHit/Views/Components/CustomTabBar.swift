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
    /// Width cap, so on every phone the bar floats as a compact island
    /// rather than running edge to edge. The order pill above matches it.
    static let maxWidth: CGFloat = 312
    /// Smallest gap to the screen edges on narrow phones.
    static let sideInset: CGFloat = 24

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
        .frame(maxWidth: Self.maxWidth)
        .padding(.horizontal, Self.sideInset)
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

/// Tucks the tab bar away while the shopper scrolls down a feed and brings it
/// back as soon as they scroll up, or reach the top.
@MainActor
final class TabBarVisibility: ObservableObject {
    static let shared = TabBarVisibility()

    @Published private(set) var isHidden = false

    private var lastOffset: CGFloat = 0
    /// Distance scrolled in the current direction; flips reset it, so a small
    /// wobble of the finger never toggles the bar.
    private var travel: CGFloat = 0
    private static let threshold: CGFloat = 24

    private init() {}

    /// `offset` is how far the content has scrolled from its top.
    func scrolled(to offset: CGFloat) {
        defer { lastOffset = offset }
        guard offset > 60 else {
            travel = 0
            show()
            return
        }
        let delta = offset - lastOffset
        if delta == 0 { return }
        if (delta > 0) != (travel > 0) {
            travel = 0
        }
        travel += delta
        if travel > Self.threshold {
            hide()
        } else if travel < -Self.threshold {
            show()
        }
    }

    func show() {
        guard isHidden else { return }
        withAnimation(.dashitSpring) { isHidden = false }
    }

    private func hide() {
        guard !isHidden else { return }
        withAnimation(.dashitSpring) { isHidden = true }
    }
}

extension CustomTabBar {
    /// How far the bar slides down, out of view, while tucked away.
    static let hiddenOffset: CGFloat = barHeight + 48
    /// How far the pills stacked above the bar drop, settling into its slot.
    static let pillDrop: CGFloat = barHeight + 10
}

/// Drops a pill that floats above the tab bar into the bar's slot while the bar
/// is tucked away. It only offsets, so no scroll view's insets change mid-drag.
private struct FollowsTabBar: ViewModifier {
    @ObservedObject private var tabBar = TabBarVisibility.shared

    func body(content: Content) -> some View {
        content.offset(y: tabBar.isHidden ? CustomTabBar.pillDrop : 0)
    }
}

extension View {
    /// For pills floating above the tab bar; see `FollowsTabBar`.
    func followsTabBar() -> some View {
        modifier(FollowsTabBar())
    }

    /// Put on a scroll view's content, inside a ScrollView carrying
    /// `.coordinateSpace(.named(space))`: its scrolling hides and shows the tab bar.
    func drivesTabBarVisibility(in space: String) -> some View {
        onGeometryChange(for: CGFloat.self) { proxy in
            -proxy.frame(in: .named(space)).minY
        } action: { offset in
            TabBarVisibility.shared.scrolled(to: offset)
        }
    }
}
