import SwiftUI

struct HeroBannerView: View {
    let offer: Offer
    var onClaim: (() -> Void)? = nil
    
    var body: some View {
        ZStack(alignment: .bottomLeading) {
            // Background Image with Dark Linear Gradient Overlay
            AsyncImage(url: URL(string: offer.img)) { phase in
                switch phase {
                case .empty:
                    ShimmerView()
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                        .clipped()
                case .failure:
                    Color.obsidianElevated
                @unknown default:
                    EmptyView()
                }
            }
            .frame(height: 160)
            
            LinearGradient(
                colors: [
                    Color.black.opacity(0.85),
                    Color.black.opacity(0.4),
                    Color.clear
                ],
                startPoint: .bottom,
                endPoint: .top
            )
            
            // Content Info
            VStack(alignment: .leading, spacing: 4) {
                Text(offer.badge)
                    .font(.dashitMicro)
                    .foregroundColor(.dashitAmber)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.dashitAmber.opacity(0.2))
                    .cornerRadius(4)
                
                Text(offer.title)
                    .font(.dashitHeadline)
                    .foregroundColor(.white)
                    .lineLimit(1)
                
                Text(offer.subtitle)
                    .font(.dashitCaption)
                    .foregroundColor(Color.white.opacity(0.8))
                    .lineLimit(1)
                
                HStack {
                    Text(offer.priceTag)
                        .font(.dashitPrice)
                        .foregroundColor(.dashitEmerald)
                    
                    Spacer()
                    
                    Text("USE \(offer.promoCode)")
                        .font(.dashitCaptionBold)
                        .foregroundColor(.black)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(Color.white)
                        .cornerRadius(6)
                }
                .padding(.top, 4)
            }
            .padding(14)
        }
        .frame(height: 160)
        .cornerRadius(18)
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(Color.obsidianBorder, lineWidth: 1)
        )
        .padding(.horizontal, 16)
    }
}
