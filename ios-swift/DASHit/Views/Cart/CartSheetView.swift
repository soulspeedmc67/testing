import SwiftUI

struct CartSheetView: View {
    @ObservedObject var cart = CartViewModel.shared
    @Environment(\.dismiss) private var dismiss
    @State private var isCheckoutOpen = false
    @State private var isCouponsOpen = false
    
    var body: some View {
        NavigationStack {
            ZStack {
                Color.obsidianBlack.ignoresSafeArea()
                
                if cart.items.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "cart")
                            .font(.system(size: 60))
                            .foregroundColor(.gray)
                        Text("Your Cart is Empty")
                            .font(.dashitHeadline)
                            .foregroundColor(.white)
                        Text("Explore fresh groceries delivered in 8 mins.")
                            .font(.dashitBody)
                            .foregroundColor(.gray)
                        Button(action: { dismiss() }) {
                            Text("Start Shopping")
                                .font(.dashitBodyBold)
                                .foregroundColor(.white)
                                .padding(.horizontal, 24)
                                .padding(.vertical, 12)
                                .background(Color.dashitEmerald)
                                .cornerRadius(10)
                        }
                    }
                } else {
                    ScrollView {
                        VStack(spacing: 16) {
                            // ₹299 Min Order Progress Alert
                            if !cart.bill.isMinOrderSatisfied {
                                HStack(spacing: 10) {
                                    Image(systemName: "exclamationmark.circle.fill")
                                        .foregroundColor(.dashitAmber)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("Minimum Order ₹299 Required")
                                            .font(.dashitCaptionBold)
                                            .foregroundColor(.white)
                                        Text("Add items worth \(CurrencyFormatter.format(cart.bill.amountNeededForMinOrder)) more to checkout.")
                                            .font(.dashitMicro)
                                            .foregroundColor(.gray)
                                    }
                                    Spacer()
                                }
                                .padding(12)
                                .background(Color.dashitAmber.opacity(0.12))
                                .cornerRadius(10)
                            }
                            
                            // Free Delivery Progress
                            if cart.bill.deliveryFee > 0 {
                                HStack(spacing: 8) {
                                    Image(systemName: "moped.fill")
                                        .foregroundColor(.dashitEmerald)
                                    Text("Add \(CurrencyFormatter.format(cart.bill.amountNeededForFreeDelivery)) more for FREE delivery")
                                        .font(.dashitCaption)
                                        .foregroundColor(.dashitEmerald)
                                    Spacer()
                                }
                                .padding(10)
                                .background(Color.dashitEmerald.opacity(0.1))
                                .cornerRadius(8)
                            }
                            
                            // Cart Items Section
                            VStack(spacing: 12) {
                                ForEach(cart.items) { item in
                                    HStack(spacing: 12) {
                                        AsyncImage(url: URL(string: item.img)) { phase in
                                            if let image = phase.image {
                                                image.resizable().scaledToFill().frame(width: 50, height: 50).clipped().cornerRadius(8)
                                            } else {
                                                Color.obsidianElevated.frame(width: 50, height: 50).cornerRadius(8)
                                            }
                                        }
                                        
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(item.name)
                                                .font(.dashitBodyBold)
                                                .foregroundColor(.white)
                                                .lineLimit(1)
                                            Text(item.unit)
                                                .font(.dashitCaption)
                                                .foregroundColor(.gray)
                                            Text(CurrencyFormatter.format(item.price))
                                                .font(.dashitPrice)
                                                .foregroundColor(.white)
                                        }
                                        
                                        Spacer()
                                        
                                        // Inline Stepper
                                        HStack(spacing: 10) {
                                            Button(action: {
                                                cart.remove(productId: item.productId, variantId: item.id)
                                            }) {
                                                Image(systemName: "minus")
                                                    .font(.system(size: 10, weight: .bold))
                                                    .foregroundColor(.white)
                                            }
                                            
                                            Text("\(item.qty)")
                                                .font(.dashitCaptionBold)
                                                .foregroundColor(.white)
                                            
                                            Button(action: {
                                                // Create lightweight dummy product for increment
                                                let p = Product(id: item.productId, name: item.name, unit: item.unit, price: item.price, img: item.img, cat: item.cat)
                                                cart.add(product: p)
                                            }) {
                                                Image(systemName: "plus")
                                                    .font(.system(size: 10, weight: .bold))
                                                    .foregroundColor(.white)
                                            }
                                        }
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(Color.dashitEmerald)
                                        .cornerRadius(6)
                                    }
                                    .padding(12)
                                    .background(Color.obsidianCard)
                                    .cornerRadius(12)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(Color.obsidianBorder, lineWidth: 1)
                                    )
                                }
                            }
                            
                            // Coupon Section Button
                            Button(action: { isCouponsOpen = true }) {
                                HStack {
                                    Image(systemName: "tag.fill")
                                        .foregroundColor(.dashitAmber)
                                    if let coupon = cart.appliedCoupon {
                                        Text("Applied '\(coupon.code)': Saved \(CurrencyFormatter.format(cart.bill.couponDiscount))")
                                            .font(.dashitCaptionBold)
                                            .foregroundColor(.white)
                                        Spacer()
                                        Button(action: { cart.removeCoupon() }) {
                                            Text("Remove")
                                                .font(.dashitMicro)
                                                .foregroundColor(.dashitRose)
                                        }
                                    } else {
                                        Text("Apply Coupon Code")
                                            .font(.dashitCaptionBold)
                                            .foregroundColor(.white)
                                        Spacer()
                                        Image(systemName: "chevron.right")
                                            .font(.system(size: 12))
                                            .foregroundColor(.gray)
                                    }
                                }
                                .padding(12)
                                .background(Color.obsidianCard)
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.obsidianBorder, lineWidth: 1)
                                )
                            }
                            
                            // Bill Details Card
                            VStack(spacing: 8) {
                                HStack {
                                    Text("Bill Details")
                                        .font(.dashitBodyBold)
                                        .foregroundColor(.white)
                                    Spacer()
                                }
                                
                                Divider().background(Color.obsidianBorder)
                                
                                HStack {
                                    Text("Item Total")
                                        .font(.dashitCaption)
                                        .foregroundColor(.gray)
                                    Spacer()
                                    Text(CurrencyFormatter.format(cart.bill.subtotal))
                                        .font(.dashitCaption)
                                        .foregroundColor(.white)
                                }
                                
                                HStack {
                                    Text("Delivery Partner Fee")
                                        .font(.dashitCaption)
                                        .foregroundColor(.gray)
                                    Spacer()
                                    if cart.bill.deliveryFee == 0 {
                                        Text("FREE")
                                            .font(.dashitCaptionBold)
                                            .foregroundColor(.dashitEmerald)
                                    } else {
                                        Text(CurrencyFormatter.format(cart.bill.deliveryFee))
                                            .font(.dashitCaption)
                                            .foregroundColor(.white)
                                    }
                                }
                                
                                if cart.bill.couponDiscount > 0 {
                                    HStack {
                                        Text("Coupon Discount")
                                            .font(.dashitCaption)
                                            .foregroundColor(.dashitEmerald)
                                        Spacer()
                                        Text("-\(CurrencyFormatter.format(cart.bill.couponDiscount))")
                                            .font(.dashitCaptionBold)
                                            .foregroundColor(.dashitEmerald)
                                    }
                                }
                                
                                Divider().background(Color.obsidianBorder)
                                
                                HStack {
                                    Text("To Pay")
                                        .font(.dashitTitle)
                                        .foregroundColor(.white)
                                    Spacer()
                                    Text(CurrencyFormatter.format(cart.bill.grandTotal))
                                        .font(.dashitHeadline)
                                        .foregroundColor(.white)
                                }
                            }
                            .padding(14)
                            .background(Color.obsidianCard)
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.obsidianBorder, lineWidth: 1)
                                )
                            
                            // Safe area spacing
                            Color.clear.frame(height: 60)
                        }
                        .padding(16)
                    }
                    
                    // Fixed Bottom Proceed Bar
                    VStack {
                        Spacer()
                        Button(action: {
                            if !cart.bill.isMinOrderSatisfied {
                                cart.showMinOrderModal = true
                                HapticsManager.shared.warning()
                            } else {
                                isCheckoutOpen = true
                                HapticsManager.shared.medium()
                            }
                        }) {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(CurrencyFormatter.format(cart.bill.grandTotal))
                                        .font(.dashitTitle)
                                        .foregroundColor(.white)
                                    Text("TOTAL")
                                        .font(.dashitMicro)
                                        .foregroundColor(Color.white.opacity(0.8))
                                }
                                Spacer()
                                Text(cart.bill.isMinOrderSatisfied ? "Proceed to Checkout" : "Min Order ₹299 Required")
                                    .font(.dashitBodyBold)
                                    .foregroundColor(.white)
                                Image(systemName: "arrow.right")
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundColor(.white)
                            }
                            .padding(16)
                            .background(cart.bill.isMinOrderSatisfied ? Color.dashitEmerald : Color.gray.opacity(0.4))
                            .cornerRadius(14)
                        }
                        .disabled(!cart.bill.isMinOrderSatisfied)
                        .padding(.horizontal, 16)
                        .padding(.bottom, 12)
                    }
                }
            }
            .navigationTitle("Your Cart")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") { dismiss() }
                        .foregroundColor(.dashitEmerald)
                }
            }
            .sheet(isPresented: $isCheckoutOpen) {
                CheckoutView()
            }
        }
    }
}
