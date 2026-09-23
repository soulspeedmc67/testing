import SwiftUI

/// Paging spotlight carousel. Cards snap into place, neighbours scale down as
/// they leave, the photo drifts behind the copy (parallax), and the carousel
/// advances every five seconds, restarting the clock after any manual swipe.
struct HeroCarouselView: View {
    let offers: [Offer]
    var onSelect: (Offer) -> Void

    @State private var currentID: String? = nil
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(spacing: 10) {
            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: 10) {
                    ForEach(offers) { offer in
                        HeroBannerView(offer: offer) { onSelect(offer) }
                            .containerRelativeFrame(.horizontal)
                            .scrollTransition(.interactive, axis: .horizontal) { content, phase in
                                content
                                    .scaleEffect(phase.isIdentity ? 1 : 0.94)
                                    .opacity(phase.isIdentity ? 1 : 0.6)
                            }
                            .id(offer.id)
                    }
                }
                .scrollTargetLayout()
            }
            .contentMargins(.horizontal, 16, for: .scrollContent)
            .scrollTargetBehavior(.viewAligned)
            .scrollPosition(id: $currentID)
            .frame(height: HeroBannerView.height)

            if offers.count > 1 {
                HStack(spacing: 5) {
                    ForEach(offers) { offer in
                        Capsule()
                            .fill(offer.id == currentID ? Color.textPrimary : Color.textFaint.opacity(0.5))
                            .frame(width: offer.id == currentID ? 16 : 5, height: 5)
                    }
                }
                .animation(.dashitSpring, value: currentID)
                .accessibilityHidden(true)
            }
        }
        .onAppear {
            if currentID == nil {
                currentID = offers.first?.id
            }
        }
        .task(id: currentID) {
            await advanceAfterDelay()
        }
    }

    private func advanceAfterDelay() async {
        guard offers.count > 1, !reduceMotion else { return }
        do {
            try await Task.sleep(for: .seconds(5))
        } catch {
            return
        }
        let index = offers.firstIndex(where: { $0.id == currentID }) ?? 0
        withAnimation(.dashitSpring) {
            currentID = offers[(index + 1) % offers.count].id
        }
    }
}

/// One spotlight card. Restrained like the web PromoBanner: a legibility scrim,
/// a short orange rule before the eyebrow, one solid orange action.
struct HeroBannerView: View {
    static let height: CGFloat = 176

    let offer: Offer
    var onClaim: (() -> Void)? = nil

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        Button {
            HapticsManager.shared.light()
            onClaim?()
        } label: {
            Color.surfaceRaised
                .overlay {
                    AsyncImage(url: URL(string: offer.img), transaction: Transaction(animation: .easeOut(duration: 0.3))) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .scaledToFill()
                        case .failure:
                            Color.surfaceRaised
                        default:
                            ShimmerView()
                        }
                    }
                    .scrollTransition(.interactive, axis: .horizontal) { content, phase in
                        content
                            .scaleEffect(reduceMotion ? 1 : 1.12)
                            .offset(x: reduceMotion ? 0 : CGFloat(phase.value) * -28)
                    }
                }
                .overlay {
                    LinearGradient(
                        colors: [Color.black.opacity(0.85), Color.black.opacity(0)],
                        startPoint: .bottom,
                        endPoint: .top
                    )
                }
                .overlay(alignment: .bottomLeading) {
                    copy
                }
                .frame(height: Self.height)
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .strokeBorder(Color.white.opacity(0.06), lineWidth: 1)
                )
                .contentShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        }
        .buttonStyle(PressableButtonStyle(scale: 0.98))
        .accessibilityLabel("\(offer.title). \(offer.subtitle). Code \(offer.promoCode).")
    }

    private var copy: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 6) {
                Rectangle()
                    .fill(Color.brandOrange)
                    .frame(width: 16, height: 1.5)
                Text(offer.badge.uppercased())
                    .font(.system(size: 10, weight: .bold))
                    .tracking(1)
                    .foregroundColor(Color.white.opacity(0.85))
                    .lineLimit(1)
            }

            Text(offer.title)
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.85)

            Text(offer.subtitle)
                .font(.system(size: 12.5))
                .foregroundColor(Color.white.opacity(0.75))
                .lineLimit(1)

            HStack(spacing: 10) {
                Text("Shop now")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 14)
                    .frame(height: 30)
                    .background(Color.brandOrange, in: RoundedRectangle(cornerRadius: 9, style: .continuous))
                Text("Code \(offer.promoCode)")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(Color.white.opacity(0.8))
                    .lineLimit(1)
                Spacer(minLength: 4)
                Text(offer.expiresIn)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(Color.white.opacity(0.6))
                    .lineLimit(1)
            }
            .padding(.top, 6)
        }
        .padding(16)
    }
}
