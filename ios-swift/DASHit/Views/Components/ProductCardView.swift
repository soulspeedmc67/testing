import SwiftUI

struct ProductCardView: View {
    let product: Product
    var onSelectVariant: (() -> Void)? = nil
    
    @ObservedObject private var cart = CartViewModel.shared
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Image Container with Badges
            ZStack(alignment: .topLeading) {
                ZStack(alignment: .bottomLeading) {
                    AsyncImage(url: URL(string: product.img)) { phase in
                        switch phase {
                        case .empty:
                            ShimmerView()
                                .frame(height: 120)
                        case .success(let image):
                            image
                                .resizable()
                                .scaledToFill()
                                .frame(height: 120)
                                .frame(maxWidth: .infinity)
                                .clipped()
                        case .failure:
                            Color.obsidianElevated
                                .frame(height: 120)
                                .overlay(
                                    Image(systemName: "photo")
                                        .foregroundColor(.gray)
                                )
                        @unknown default:
                            EmptyView()
                        }
                    }
                    .frame(height: 120)
                    .background(Color.obsidianElevated)
                    .cornerRadius(12)
                    
                    // 8 Mins ETA Tag
                    HStack(spacing: 3) {
                        Image(systemName: "bolt.fill")
                            .font(.system(size: 9))
                            .foregroundColor(.dashitAmber)
                        Text(product.time ?? "8 MINS")
                            .font(.dashitMicro)
                            .foregroundColor(.white)
                    }
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(Color.black.opacity(0.75))
                    .cornerRadius(6)
                    .padding(6)
                }
                
                // Discount / Promo Badge
                if let badge = product.badge, !badge.isEmpty {
                    Text(badge.uppercased())
                        .font(.system(size: 9, weight: .black))
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2.5)
                        .background(
                            LinearGradient(
                                colors: [Color.dashitEmerald, Color.dashitEmeraldDark],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .cornerRadius(4)
                        .padding(6)
                }
            }
            
            // Product Name
            Text(product.name)
                .font(.dashitBodyBold)
                .foregroundColor(.white)
                .lineLimit(2)
                .frame(height: 38, alignment: .topLeading)
            
            // Unit Weight / Volume
            Text(product.unit)
                .font(.dashitCaption)
                .foregroundColor(.gray)
            
            // Price & Stepper Row
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 1) {
                    Text(CurrencyFormatter.format(product.price))
                        .font(.dashitPrice)
                        .foregroundColor(.white)
                    
                    if let original = product.originalPrice, original > product.price {
                        Text(CurrencyFormatter.format(original))
                            .font(.dashitCaption)
                            .foregroundColor(.gray)
                            .strikethrough()
                    }
                }
                
                Spacer()
                
                // Quantity Stepper or ADD CTA
                let qty = cart.quantity(for: product.id)
                if qty == 0 {
                    Button(action: {
                        if let variants = product.variants, variants.count > 1 {
                            onSelectVariant?()
                        } else {
                            cart.add(product: product)
                        }
                    }) {
                        Text(product.variants != nil && product.variants!.count > 1 ? "OPTIONS" : "ADD")
                            .font(.dashitCaptionBold)
                            .foregroundColor(.dashitEmerald)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 6)
                            .background(Color.dashitEmerald.opacity(0.12))
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(Color.dashitEmerald.opacity(0.4), lineWidth: 1)
                            )
                            .cornerRadius(8)
                    }
                } else {
                    HStack(spacing: 10) {
                        Button(action: {
                            cart.remove(productId: product.id)
                        }) {
                            Image(systemName: "minus")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.white)
                        }
                        
                        Text("\(qty)")
                            .font(.dashitCaptionBold)
                            .foregroundColor(.white)
                        
                        Button(action: {
                            cart.add(product: product)
                        }) {
                            Image(systemName: "plus")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.white)
                        }
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.dashitEmerald)
                    .cornerRadius(8)
                }
            }
        }
        .padding(10)
        .background(Color.obsidianCard)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.obsidianBorder, lineWidth: 1)
        )
        .cornerRadius(16)
    }
}
