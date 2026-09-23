import SwiftUI

struct CheckoutView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var vm = CheckoutViewModel()
    @ObservedObject private var cart = CartViewModel.shared
    @ObservedObject private var auth = AuthService.shared
    @State private var isAddressSheetOpen = false
    @State private var isTrackingOpen = false
    @State private var isAuthModalOpen = false
    
    var body: some View {
        NavigationStack {
            ZStack {
                Color.obsidianBlack.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 16) {
                        // 1. Delivery Address Card
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                Image(systemName: "mappin.and.ellipse")
                                    .foregroundColor(.dashitEmerald)
                                Text("Delivering to \(vm.selectedAddress.nickname)")
                                    .font(.dashitBodyBold)
                                    .foregroundColor(.white)
                                Spacer()
                                Button("Change") {
                                    isAddressSheetOpen = true
                                }
                                .font(.dashitCaptionBold)
                                .foregroundColor(.dashitEmerald)
                            }
                            
                            Text(vm.selectedAddress.formattedSummary)
                                .font(.dashitCaption)
                                .foregroundColor(.gray)
                        }
                        .padding(14)
                        .background(Color.obsidianCard)
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.obsidianBorder, lineWidth: 1)
                        )
                        
                        // 2. Delivery Time Guarantee
                        HStack(spacing: 12) {
                            Image(systemName: "bolt.badge.clock.fill")
                                .font(.system(size: 24))
                                .foregroundColor(.dashitAmber)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Delivery in 8 Minutes")
                                    .font(.dashitBodyBold)
                                    .foregroundColor(.white)
                                Text("Fulfilled from DASHit Anantnag Dark Store")
                                    .font(.dashitMicro)
                                    .foregroundColor(.gray)
                            }
                            Spacer()
                        }
                        .padding(14)
                        .background(Color.obsidianCard)
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.obsidianBorder, lineWidth: 1)
                        )
                        
                        // 3. Payment Method Selection
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Payment Method")
                                .font(.dashitBodyBold)
                                .foregroundColor(.white)
                            
                            // Cash On Delivery
                            Button(action: {
                                vm.paymentMethod = "cod"
                                HapticsManager.shared.selection()
                            }) {
                                HStack {
                                    Image(systemName: "banknote.fill")
                                        .foregroundColor(.dashitEmerald)
                                    Text("Cash on Delivery (Pay at Doorstep)")
                                        .font(.dashitBody)
                                        .foregroundColor(.white)
                                    Spacer()
                                    Image(systemName: vm.paymentMethod == "cod" ? "checkmark.circle.fill" : "circle")
                                        .foregroundColor(vm.paymentMethod == "cod" ? .dashitEmerald : .gray)
                                }
                                .padding(12)
                                .background(vm.paymentMethod == "cod" ? Color.dashitEmerald.opacity(0.1) : Color.obsidianElevated)
                                .cornerRadius(10)
                            }
                            
                            // Apple Pay
                            Button(action: {
                                vm.paymentMethod = "apple_pay"
                                HapticsManager.shared.selection()
                            }) {
                                HStack {
                                    Image(systemName: "apple.logo")
                                        .foregroundColor(.white)
                                    Text("Apple Pay")
                                        .font(.dashitBody)
                                        .foregroundColor(.white)
                                    Spacer()
                                    Image(systemName: vm.paymentMethod == "apple_pay" ? "checkmark.circle.fill" : "circle")
                                        .foregroundColor(vm.paymentMethod == "apple_pay" ? .dashitEmerald : .gray)
                                }
                                .padding(12)
                                .background(vm.paymentMethod == "apple_pay" ? Color.dashitEmerald.opacity(0.1) : Color.obsidianElevated)
                                .cornerRadius(10)
                            }
                        }
                        .padding(14)
                        .background(Color.obsidianCard)
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.obsidianBorder, lineWidth: 1)
                        )
                        
                        // 4. Order Bill Summary
                        VStack(spacing: 8) {
                            HStack {
                                Text("Order Total")
                                    .font(.dashitBodyBold)
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
                    }
                    .padding(16)
                }
                
                // Bottom Fixed CTA
                VStack {
                    Spacer()
                    Button(action: {
                        Task {
                            if !auth.isAuthenticated {
                                isAuthModalOpen = true
                                return
                            }
                            let success = await vm.placeOrder(cart: cart, auth: auth)
                            if success {
                                isTrackingOpen = true
                            }
                        }
                    }) {
                        HStack {
                            if vm.isSubmitting {
                                ProgressView()
                                    .tint(.white)
                                    .padding(.trailing, 8)
                            }
                            Text(vm.isSubmitting ? "Placing Order..." : "Place Order • \(CurrencyFormatter.format(cart.bill.grandTotal))")
                                .font(.dashitBodyBold)
                                .foregroundColor(.white)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(16)
                        .background(vm.isSubmitting ? Color.gray : Color.dashitEmerald)
                        .cornerRadius(14)
                    }
                    .disabled(vm.isSubmitting)
                    .padding(.horizontal, 16)
                    .padding(.bottom, 12)
                }
            }
            .navigationTitle("Checkout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Back") { dismiss() }
                        .foregroundColor(.dashitEmerald)
                }
            }
            .sheet(isPresented: $isAddressSheetOpen) {
                AddressPickerMapView()
            }
            .fullScreenCover(isPresented: $isTrackingOpen) {
                if let order = vm.completedOrder {
                    LiveTrackingMapView(orderId: order.id)
                }
            }
        }
    }
}
