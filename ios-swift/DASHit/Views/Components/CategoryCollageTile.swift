import SwiftUI

/// "Shop by category" tile: a 2×2 collage of the category's products, a count
/// of what else is inside, and the name underneath. Falls back to one large
/// photo when a category has fewer than four products.
struct CategoryCollageTile: View {
    let tile: CategoryTile
    var onTap: () -> Void

    private var extraCount: Int { max(tile.productCount - 4, 0) }
    private var tileShape: RoundedRectangle { RoundedRectangle(cornerRadius: 18, style: .continuous) }

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 0) {
                collage
                    .overlay(alignment: .bottom) {
                        if extraCount > 0 {
                            Text("+\(extraCount) more")
                                .font(.system(size: 10.5, weight: .semibold))
                                .foregroundColor(.textSecondary)
                                .padding(.horizontal, 8)
                                .frame(height: 20)
                                .background(Color.surfaceOverlay, in: Capsule())
                                .overlay(Capsule().strokeBorder(Color.hairlineStrong, lineWidth: 1))
                                .offset(y: 10)
                        }
                    }

                Text(tile.name)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.textPrimary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2, reservesSpace: true)
                    .padding(.top, 16)
                    .padding(.horizontal, 2)
            }
            .padding(6)
            .padding(.bottom, 4)
            .background(Color.surfaceRaised, in: tileShape)
            .overlay(tileShape.strokeBorder(Color.hairline, lineWidth: 1))
            .contentShape(tileShape)
        }
        .buttonStyle(PressableButtonStyle(scale: 0.96))
        .accessibilityLabel("\(tile.name), \(tile.productCount) products")
    }

    @ViewBuilder
    private var collage: some View {
        if tile.previewImages.count >= 4 {
            VStack(spacing: 4) {
                HStack(spacing: 4) {
                    cell(tile.previewImages[0])
                    cell(tile.previewImages[1])
                }
                HStack(spacing: 4) {
                    cell(tile.previewImages[2])
                    cell(tile.previewImages[3])
                }
            }
        } else {
            cell(tile.previewImages.first, cornerRadius: 13)
        }
    }

    private func cell(_ url: String?, cornerRadius: CGFloat = 10) -> some View {
        Color.surfaceMuted
            .aspectRatio(1, contentMode: .fit)
            .overlay {
                AsyncImage(url: url.flatMap { URL(string: $0) }, transaction: Transaction(animation: .easeOut(duration: 0.2))) { phase in
                    if let image = phase.image {
                        image
                            .resizable()
                            .scaledToFill()
                    } else {
                        Color.surfaceMuted
                    }
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
    }
}
