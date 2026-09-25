import SwiftUI
import UIKit

// Skeleton loading: muted shapes laid out like the content that is coming,
// with one soft highlight sweeping across them. Every skeleton reads the same
// clock and its position on screen, so the highlight travels across the whole
// screen as one band instead of each block flickering on its own.

extension Color {
    /// The sweeping highlight: faint on dark surfaces, brighter on light ones.
    static let skeletonHighlight = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(white: 1, alpha: 0.06)
            : UIColor(white: 1, alpha: 0.75)
    })
}

private struct ShimmerEffect: ViewModifier {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// Seconds for the band to cross the screen, then a short rest.
    private static let period: Double = 1.6
    private static let bandWidth: CGFloat = 180
    /// How far the band travels, in screen points.
    private static let sweep: CGFloat = 520

    func body(content: Content) -> some View {
        if reduceMotion {
            content
        } else {
            content.overlay {
                GeometryReader { geo in
                    let minX = geo.frame(in: .global).minX
                    TimelineView(.animation) { context in
                        let time = context.date.timeIntervalSinceReferenceDate
                        let progress = CGFloat(time.truncatingRemainder(dividingBy: Self.period) / Self.period)
                        LinearGradient(
                            colors: [.clear, .skeletonHighlight, .clear],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                        .frame(width: Self.bandWidth)
                        .offset(x: -Self.bandWidth + progress * (Self.sweep + Self.bandWidth) - minX)
                    }
                }
                .mask(content)
                .allowsHitTesting(false)
            }
        }
    }
}

extension View {
    /// Sweeps the skeleton highlight across this view's shapes.
    func shimmering() -> some View {
        modifier(ShimmerEffect())
    }
}

/// One muted placeholder shape.
struct SkeletonBlock: View {
    var width: CGFloat? = nil
    var height: CGFloat
    var cornerRadius: CGFloat = 6

    var body: some View {
        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            .fill(Color.surfaceMuted)
            .frame(width: width, height: height)
    }
}

/// A shimmering fill for images that are still downloading.
struct ShimmerView: View {
    var body: some View {
        Color.surfaceMuted
            .shimmering()
    }
}

/// A product card in the layout of `ProductCardView`.
struct ProductCardSkeleton: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Color.surfaceMuted)
                .aspectRatio(1, contentMode: .fit)
            SkeletonBlock(width: 42, height: 10, cornerRadius: 4)
            SkeletonBlock(height: 11)
            SkeletonBlock(width: 70, height: 11)
            HStack {
                SkeletonBlock(width: 38, height: 14)
                Spacer(minLength: 0)
                SkeletonBlock(width: 52, height: 28, cornerRadius: 8)
            }
            .padding(.top, 2)
        }
        .padding(8)
        .dashitCard(cornerRadius: 14)
    }
}

/// The home feed while the catalogue loads: category tiles, a department
/// grid and a product rail.
struct HomeFeedSkeleton: View {
    private let tiles = Array(repeating: GridItem(.flexible(), spacing: 10), count: 3)
    private let cards = Array(repeating: GridItem(.flexible(), spacing: 10), count: 4)

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            SkeletonBlock(width: 150, height: 18)
                .padding(.horizontal, 16)
            LazyVGrid(columns: tiles, spacing: 12) {
                ForEach(0..<6, id: \.self) { _ in
                    VStack(spacing: 8) {
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .fill(Color.surfaceMuted)
                            .aspectRatio(1, contentMode: .fit)
                        SkeletonBlock(width: 64, height: 10)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)

            SkeletonBlock(width: 120, height: 18)
                .padding(.horizontal, 16)
                .padding(.top, 30)
            LazyVGrid(columns: cards, spacing: 14) {
                ForEach(0..<8, id: \.self) { _ in
                    VStack(spacing: 7) {
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .fill(Color.surfaceMuted)
                            .aspectRatio(1, contentMode: .fit)
                        SkeletonBlock(width: 48, height: 9)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)

            SkeletonBlock(width: 140, height: 18)
                .padding(.horizontal, 16)
                .padding(.top, 30)
            HStack(spacing: 10) {
                ForEach(0..<3, id: \.self) { _ in
                    ProductCardSkeleton()
                        .frame(width: 128)
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
        }
        .shimmering()
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Loading")
    }
}

/// A grid of product cards while products load.
struct ProductGridSkeleton: View {
    var columns: Int = 2
    var count: Int = 6

    var body: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10, alignment: .top), count: columns), spacing: 10) {
            ForEach(0..<count, id: \.self) { _ in
                ProductCardSkeleton()
            }
        }
        .shimmering()
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Loading")
    }
}

/// The category sidebar while categories load.
struct CategorySidebarSkeleton: View {
    var body: some View {
        VStack(spacing: 14) {
            ForEach(0..<7, id: \.self) { _ in
                VStack(spacing: 6) {
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(Color.surfaceMuted)
                        .frame(width: 52, height: 52)
                    SkeletonBlock(width: 50, height: 8)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity)
        .shimmering()
    }
}

/// Order cards in the layout of the order history while it loads.
struct OrderListSkeleton: View {
    var body: some View {
        VStack(spacing: 12) {
            ForEach(0..<3, id: \.self) { _ in
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        VStack(alignment: .leading, spacing: 6) {
                            SkeletonBlock(width: 120, height: 13)
                            SkeletonBlock(width: 84, height: 10)
                        }
                        Spacer()
                        SkeletonBlock(width: 70, height: 22, cornerRadius: 11)
                    }
                    HStack(spacing: 8) {
                        ForEach(0..<4, id: \.self) { _ in
                            SkeletonBlock(width: 44, height: 44, cornerRadius: 10)
                        }
                        Spacer(minLength: 0)
                    }
                    HStack {
                        SkeletonBlock(width: 90, height: 12)
                        Spacer()
                        SkeletonBlock(width: 96, height: 32, cornerRadius: 10)
                    }
                }
                .padding(14)
                .dashitCard(cornerRadius: 18)
            }
        }
        .shimmering()
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Loading your orders")
    }
}

/// The dark order card on the tracking map while the order loads.
struct TrackingCardSkeleton: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                bar(width: 150, height: 15)
                Spacer()
                bar(width: 80, height: 15)
            }
            bar(width: 200, height: 11)
            HStack(spacing: 8) {
                Circle().fill(Color.white.opacity(0.1)).frame(width: 26, height: 26)
                bar(height: 3)
                Circle().fill(Color.white.opacity(0.1)).frame(width: 26, height: 26)
            }
            HStack {
                bar(width: 110, height: 12)
                Spacer()
                bar(width: 108, height: 32)
            }
        }
        .padding(16)
        .shimmering()
        .background(Color.trackerCard, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 24, style: .continuous).strokeBorder(Color.white.opacity(0.1), lineWidth: 1))
        .environment(\.colorScheme, .dark)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Loading your order")
    }

    private func bar(width: CGFloat? = nil, height: CGFloat) -> some View {
        RoundedRectangle(cornerRadius: min(6, height / 2), style: .continuous)
            .fill(Color.white.opacity(0.1))
            .frame(width: width, height: height)
    }
}
