import SwiftUI

struct CheckoutView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var vm = CheckoutViewModel()
    @ObservedObject private var cart = CartViewModel.shared
    @ObservedObject private var auth = AuthService.shared
    @State private var isAddressSheetOpen = false
    @State private var isAuthModalOpen = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.surface.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 16) {
                        // 1. Delivery Address Card
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                Image(systemName: "mappin.and.ellipse")
                                    .foregroundColor(.brandAccent)
                                Text("Delivering to \(vm.selectedAddress.nickname)")
                                    .font(.dashitBodyBold)
                                    .foregroundColor(.textPrimary)
                                Spacer()
                                Button("Change") {
                                    isAddressSheetOpen = true
                                }
                                .font(.dashitCaptionBold)
                                .foregroundColor(.brandAccent)
                            }

                            Text(vm.selectedAddress.formattedSummary)
                                .font(.dashitCaption)
                                .foregroundColor(.textMuted)
                        }
                        .padding(14)
                        .background(Color.surfaceRaised)
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.hairline, lineWidth: 1)
                        )

                        // 2. Delivery Time Guarantee
                        HStack(spacing: 12) {
                            Image(systemName: "bolt.badge.clock.fill")
                                .font(.system(size: 24))
                                .foregroundColor(.caution)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(deliveryHeadline)
                                    .font(.dashitBodyBold)
                                    .foregroundColor(vm.deliveryQuote.isDeliverable ? .textPrimary : .danger)
                                Text(vm.deliveryQuote.isDeliverable
                                     ? "\(vm.deliveryQuote.distanceText) · Fulfilled from DASHit Anantnag Dark Store"
                                     : "\(vm.deliveryQuote.distanceText) · We deliver within 5 km of our Anantnag hub")
                                    .font(.dashitMicro)
                                    .foregroundColor(.textMuted)
                            }
                            Spacer()
                        }
                        .padding(14)
                        .background(Color.surfaceRaised)
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.hairline, lineWidth: 1)
                        )

                        // 3. Payment Method Selection
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Payment Method")
                                .font(.dashitBodyBold)
                                .foregroundColor(.textPrimary)

                            // Cash On Delivery
                            Button(action: {
                                vm.paymentMethod = "cod"
                                HapticsManager.shared.selection()
                            }) {
                                HStack {
                                    Image(systemName: "banknote.fill")
                                        .foregroundColor(.brandAccent)
                                    Text("Cash on Delivery (Pay at Doorstep)")
                                        .font(.dashitBody)
                                        .foregroundColor(.textPrimary)
                                    Spacer()
                                    Image(systemName: vm.paymentMethod == "cod" ? "checkmark.circle.fill" : "circle")
                                        .foregroundColor(vm.paymentMethod == "cod" ? .brandOrange : .gray)
                                }
                                .padding(12)
                                .background(vm.paymentMethod == "cod" ? Color.brandOrange.opacity(0.1) : Color.surfaceMuted)
                                .cornerRadius(10)
                            }

                            // Apple Pay
                            Button(action: {
                                vm.paymentMethod = "apple_pay"
                                HapticsManager.shared.selection()
                            }) {
                                HStack {
                                    Image(systemName: "apple.logo")
                                        .foregroundColor(.textPrimary)
                                    Text("Apple Pay")
                                        .font(.dashitBody)
                                        .foregroundColor(.textPrimary)
                                    Spacer()
                                    Image(systemName: vm.paymentMethod == "apple_pay" ? "checkmark.circle.fill" : "circle")
                                        .foregroundColor(vm.paymentMethod == "apple_pay" ? .brandOrange : .gray)
                                }
                                .padding(12)
                                .background(vm.paymentMethod == "apple_pay" ? Color.brandOrange.opacity(0.1) : Color.surfaceMuted)
                                .cornerRadius(10)
                            }
                        }
                        .padding(14)
                        .background(Color.surfaceRaised)
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.hairline, lineWidth: 1)
                        )

                        // 4. Order Bill Summary
                        VStack(spacing: 8) {
                            HStack {
                                Text("Order Total")
                                    .font(.dashitBodyBold)
                                    .foregroundColor(.textPrimary)
                                Spacer()
                                Text(CurrencyFormatter.format(cart.bill.grandTotal))
                                    .font(.dashitHeadline)
                                    .foregroundColor(.textPrimary)
                            }
                        }
                        .padding(14)
                        .background(Color.surfaceRaised)
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.hairline, lineWidth: 1)
                        )
                    }
                    .padding(16)
                }

                // Bottom Fixed CTA
                VStack(spacing: 10) {
                    Spacer()
                    if let error = vm.orderError {
                        HStack(alignment: .top, spacing: 8) {
                            Image(systemName: "exclamationmark.circle.fill")
                                .foregroundColor(.danger)
                            Text(error)
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.textPrimary)
                                .fixedSize(horizontal: false, vertical: true)
                            Spacer(minLength: 0)
                        }
                        .padding(12)
                        .dashitCard(cornerRadius: 12)
                        .padding(.horizontal, 16)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                    }
                    Button(action: {
                        Task {
                            if !auth.isAuthenticated || auth.needsPhoneNumber {
                                isAuthModalOpen = true
                                return
                            }
                            let success = await vm.placeOrder(cart: cart, auth: auth)
                            if success {
                                // Closing the cart sheet closes checkout with it; RootView
                                // then opens live tracking for the new order.
                                cart.isCartSheetPresented = false
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
                        .background(vm.isSubmitting ? Color.gray : Color.brandOrange)
                        .cornerRadius(14)
                    }
                    .disabled(vm.isSubmitting || cart.items.isEmpty)
                    .padding(.horizontal, 16)
                    .padding(.bottom, 12)
                }
                .animation(.dashitSpring, value: vm.orderError)
            }
            .navigationTitle("Checkout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Back") { dismiss() }
                        .foregroundColor(.brandAccent)
                }
            }
            .sheet(isPresented: $isAddressSheetOpen, onDismiss: {
                vm.reloadSavedAddress()
            }) {
                AddressPickerMapView()
            }
            // Signed-out shoppers get the phone sign-in, then return here.
            .sheet(isPresented: $isAuthModalOpen) {
                ProfileView()
                    .dashitSheet([.large])
            }
            // Close once signed in with a delivery number (Apple and email
            // accounts add theirs in the same sheet first).
            .onChange(of: auth.isAuthenticated && !auth.needsPhoneNumber) { _, isReady in
                if isReady {
                    isAuthModalOpen = false
                }
            }
        }
    }

    private var deliveryHeadline: String {
        guard let eta = StoreStatusStore.shared.etaMinutes(for: vm.deliveryQuote) else {
            return "Outside our delivery area"
        }
        return "Delivery in \(eta) minutes"
    }
}
