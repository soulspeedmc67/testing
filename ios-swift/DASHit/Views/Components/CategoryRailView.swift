import SwiftUI

struct CategoryRailView: View {
    let categories: [Category]
    let selectedCategory: String?
    let onSelect: (String?) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                chip(title: "All", icon: "square.grid.2x2.fill", isSelected: selectedCategory == nil) {
                    onSelect(nil)
                }
                ForEach(categories) { category in
                    chip(title: category.name, icon: category.icon, isSelected: selectedCategory == category.name) {
                        onSelect(category.name)
                    }
                }
            }
        }
        .contentMargins(.horizontal, 16, for: .scrollContent)
        .animation(.dashitSpring, value: selectedCategory)
    }

    private func chip(title: String, icon: String?, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 6) {
                if let icon {
                    Image(systemName: icon)
                        .font(.system(size: 12, weight: .semibold))
                }
                Text(title)
                    .font(.system(size: 13, weight: .semibold))
            }
            .foregroundColor(isSelected ? .white : .textSecondary)
            .padding(.horizontal, 14)
            .frame(height: 36)
            .background(isSelected ? Color.brandOrange : Color.surfaceRaised, in: Capsule())
            .overlay(Capsule().strokeBorder(isSelected ? Color.clear : Color.hairline, lineWidth: 1))
            .contentShape(Capsule())
        }
        .buttonStyle(.pressable)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}
