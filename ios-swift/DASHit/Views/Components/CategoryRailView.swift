import SwiftUI

struct CategoryRailView: View {
    let categories: [Category]
    let selectedCategory: String?
    let onSelect: (String?) -> Void
    
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                // "All" Pill
                Button(action: { onSelect(nil) }) {
                    Text("All Items")
                        .font(.dashitCaptionBold)
                        .foregroundColor(selectedCategory == nil ? .black : .white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(selectedCategory == nil ? Color.dashitEmerald : Color.obsidianCard)
                        .cornerRadius(20)
                        .overlay(
                            RoundedRectangle(cornerRadius: 20)
                                .stroke(Color.obsidianBorder, lineWidth: selectedCategory == nil ? 0 : 1)
                        )
                }
                
                ForEach(categories) { cat in
                    Button(action: { onSelect(cat.name) }) {
                        HStack(spacing: 6) {
                            if let icon = cat.icon {
                                Image(systemName: icon)
                                    .font(.system(size: 12))
                                    .foregroundColor(selectedCategory == cat.name ? .black : .dashitEmerald)
                            }
                            Text(cat.name)
                                .font(.dashitCaptionBold)
                                .foregroundColor(selectedCategory == cat.name ? .black : .white)
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(selectedCategory == cat.name ? Color.dashitEmerald : Color.obsidianCard)
                        .cornerRadius(20)
                        .overlay(
                            RoundedRectangle(cornerRadius: 20)
                                .stroke(Color.obsidianBorder, lineWidth: selectedCategory == cat.name ? 0 : 1)
                        )
                    }
                }
            }
            .padding(.horizontal, 16)
        }
    }
}
