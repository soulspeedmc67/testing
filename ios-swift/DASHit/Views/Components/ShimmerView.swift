import SwiftUI

/// Ultra-smooth native SwiftUI linear shimmer effect
struct ShimmerView: View {
    @State private var phase: CGFloat = -1.0
    
    var body: some View {
        GeometryReader { geo in
            Color.surfaceMuted
                .overlay(
                    LinearGradient(
                        colors: [
                            .clear,
                            Color.white.opacity(0.08),
                            .clear
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .offset(x: phase * geo.size.width)
                )
                .clipped()
        }
        .onAppear {
            withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
                phase = 1.0
            }
        }
    }
}
