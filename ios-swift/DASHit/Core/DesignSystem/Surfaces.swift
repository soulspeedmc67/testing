import SwiftUI

extension View {
    /// A raised card: surface fill and a hairline border whose top edge catches
    /// the light in dark mode, so cards read as surfaces rather than outlines.
    func dashitCard<S: InsettableShape>(_ shape: S, fill: Color = .surfaceRaised) -> some View {
        background(fill, in: shape)
            .overlay(
                shape.strokeBorder(
                    LinearGradient(
                        colors: [Color.edgeHighlight, Color.hairline],
                        startPoint: .top,
                        endPoint: .bottom
                    ),
                    lineWidth: 1
                )
            )
    }

    func dashitCard(cornerRadius: CGFloat = 16, fill: Color = .surfaceRaised) -> some View {
        dashitCard(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous), fill: fill)
    }
}
