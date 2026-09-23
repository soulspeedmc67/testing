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
}

struct CustomTabBar: View {
    @Binding var selectedTab: TabItem
    
    var body: some View {
        HStack {
            ForEach(TabItem.allCases, id: \.self) { tab in
                Spacer()
                Button(action: {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        selectedTab = tab
                    }
                    HapticsManager.shared.light()
                }) {
                    VStack(spacing: 4) {
                        Image(systemName: tab.iconName)
                            .font(.system(size: 18, weight: selectedTab == tab ? .bold : .regular))
                            .foregroundColor(selectedTab == tab ? .dashitEmerald : .gray)
                            .scaleEffect(selectedTab == tab ? 1.15 : 1.0)
                        
                        Text(tab.rawValue)
                            .font(.dashitMicro)
                            .foregroundColor(selectedTab == tab ? .dashitEmerald : .gray)
                    }
                }
                Spacer()
            }
        }
        .padding(.vertical, 10)
        .background(
            Color.obsidianCard
                .overlay(
                    Rectangle()
                        .frame(height: 1)
                        .foregroundColor(Color.obsidianBorder),
                    alignment: .top
                )
        )
    }
}
