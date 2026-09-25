import SwiftUI

/// "Shop by category" tile: a collage of the category's products, a count of
/// what else is inside, and the name underneath. The collage adapts to how
/// many products the category has (1, 2, 3 or 4+) instead of leaving gaps.
struct CategoryCollageTile: View {
    let tile: CategoryTile
    var onTap: () -> Void

    private var shownCount: Int { min(max(tile.previewImages.count, 1), 4) }
    private var extraCount: Int { max(tile.productCount - shownCount, 0) }
    private var tileShape: RoundedRectangle { RoundedRectangle(cornerRadius: 20, style: .continuous) }

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 0) {
                Color.clear
                    .aspectRatio(1, contentMode: .fit)
                    .overlay { collage }
                    .overlay(alignment: .bottom) {
                        if extraCount > 0 {
                            Text("+\(extraCount) more")
                                .font(.system(size: 10.5, weight: .semibold))
                                .foregroundColor(.textSecondary)
                                .padding(.horizontal, 9)
                                .frame(height: 21)
                                .background(Color.surfaceOverlay, in: Capsule())
                                .overlay(Capsule().strokeBorder(Color.hairlineStrong, lineWidth: 1))
                                .offset(y: 10)
                        }
                    }

                Text(tile.name)
                    .font(.system(size: 13.5, weight: .bold))
                    .foregroundColor(.textPrimary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2, reservesSpace: true)
                    .padding(.top, 16)
                    .padding(.horizontal, 2)
            }
            .padding(6)
            .padding(.bottom, 4)
            .dashitCard(tileShape)
            .contentShape(tileShape)
        }
        .buttonStyle(PressableButtonStyle(scale: 0.96))
        .accessibilityLabel("\(tile.name), \(tile.productCount) products")
    }

    @ViewBuilder
    private var collage: some View {
        let images = tile.previewImages
        switch images.count {
        case 0, 1:
            cell(images.first, cornerRadius: 14)
        case 2:
            HStack(spacing: 4) {
                cell(images[0])
                cell(images[1])
            }
        case 3:
            HStack(spacing: 4) {
                cell(images[0])
                VStack(spacing: 4) {
                    cell(images[1])
                    cell(images[2])
                }
            }
        default:
            VStack(spacing: 4) {
                HStack(spacing: 4) {
                    cell(images[0])
                    cell(images[1])
                }
                HStack(spacing: 4) {
                    cell(images[2])
                    cell(images[3])
                }
            }
        }
    }

    private func cell(_ url: String?, cornerRadius: CGFloat = 11) -> some View {
        Color.surfaceMuted
            .overlay {
                AsyncImage(url: url.flatMap { URL(string: $0) }, transaction: Transaction(animation: .easeOut(duration: 0.2))) { phase in
                    if let image = phase.image {
                        image
                            .resizable()
                            .scaledToFill()
                    } else if phase.error == nil && url?.isEmpty == false {
                        ShimmerView()
                    } else {
                        Color.surfaceMuted
                    }
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
    }
}

/// Compact department card: one product photo on a soft tile, name below.
struct CategoryCard: View {
    let tile: CategoryTile
    var onTap: () -> Void

    private var tileShape: RoundedRectangle { RoundedRectangle(cornerRadius: 16, style: .continuous) }

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 6) {
                Color.surfaceMuted
                    .aspectRatio(1, contentMode: .fit)
                    .overlay {
                        AsyncImage(url: tile.previewImages.first.flatMap { URL(string: $0) }, transaction: Transaction(animation: .easeOut(duration: 0.2))) { phase in
                            if let image = phase.image {
                                image
                                    .resizable()
                                    .scaledToFill()
                            } else {
                                Image(systemName: CategorySymbol.name(for: Category(id: tile.id, name: tile.name)))
                                    .font(.system(size: 22))
                                    .foregroundColor(.textFaint)
                            }
                        }
                    }
                    .clipShape(tileShape)
                    .overlay(tileShape.strokeBorder(Color.hairline, lineWidth: 1))
                Text(tile.name)
                    .font(.system(size: 11.5, weight: .semibold))
                    .foregroundColor(.textPrimary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2, reservesSpace: true)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(PressableButtonStyle(scale: 0.94))
        .accessibilityLabel(tile.name)
    }
}
