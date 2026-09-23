import SwiftUI

struct ProductDetailSheet: View {
    let product: Product
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var cart = CartViewModel.shared
    @State private var selectedVariant: ProductVariant?
    
    var body: some View {
        ZStack {
            Color.obsidianCard.ignoresSafeArea()
            
            VStack(alignment: .leading, spacing: 16) {
                // Header with drag indicator
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(product.name)
                            .font(.dashitTitle)
                            .foregroundColor(.white)
                        Text(product.cat)
                            .font(.dashitCaption)
                            .foregroundColor(.dashitEmerald)
                    }
                    Spacer()
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 24))
                            .foregroundColor(.gray)
                    }
                }
                .padding(.top, 16)
                
                // 18+ Age Warning if product is age-restricted
                if product.ageRestricted == true {
                    HStack(spacing: 8) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.dashitAmber)
                        Text("18+ Statutory Restriction: Age verification required upon delivery.")
                            .font(.dashitMicro)
                            .foregroundColor(.white)
                    }
                    .padding(10)
                    .background(Color.dashitAmber.opacity(0.15))
                    .cornerRadius(8)
                }
                
                Text("Select Size / Variant")
                    .font(.dashitBodyBold)
                    .foregroundColor(.white)
                
                // Variants List
                if let variants = product.variants {
                    VStack(spacing: 10) {
                        ForEach(variants) { variant in
                            let isSelected = selectedVariant?.id == variant.id || (selectedVariant == nil && variant.id == variants.first?.id)
                            
                            Button(action: {
                                selectedVariant = variant
                                HapticsManager.shared.selection()
                            }) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(variant.unit)
                                            .font(.dashitBodyBold)
                                            .foregroundColor(.white)
                                        
                                        HStack(spacing: 6) {
                                            Text(CurrencyFormatter.format(variant.price))
                                                .font(.dashitPrice)
                                                .foregroundColor(.dashitEmerald)
                                            
                                            if let orig = variant.originalPrice, orig > variant.price {
                                                Text(CurrencyFormatter.format(orig))
                                                    .font(.dashitCaption)
                                                    .foregroundColor(.gray)
                                                    .strikethrough()
                                            }
                                        }
                                    }
                                    
                                    Spacer()
                                    
                                    Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                                        .font(.system(size: 20))
                                        .foregroundColor(isSelected ? .dashitEmerald : .gray)
                                }
                                .padding(12)
                                .background(isSelected ? Color.dashitEmerald.opacity(0.1) : Color.obsidianElevated)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(isSelected ? Color.dashitEmerald : Color.obsidianBorder, lineWidth: 1)
                                )
                                .cornerRadius(12)
                            }
                        }
                    }
                }
                
                Spacer()
                
                // Add to Cart Button
                Button(action: {
                    let chosen = selectedVariant ?? product.variants?.first
                    cart.add(product: product, variant: chosen)
                    HapticsManager.shared.success()
                    dismiss()
                }) {
                    Text("Add to Cart")
                        .font(.dashitBodyBold)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.dashitEmerald)
                        .cornerRadius(12)
                }
                .padding(.bottom, 16)
            }
            .padding(.horizontal, 20)
        }
    }
}
