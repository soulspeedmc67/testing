import SwiftUI

struct CheckoutView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var vm = CheckoutViewModel()
    @ObservedObject private var cart = CartViewModel.shared
    @ObservedObject private var auth = AuthService.shared
    @State private var isAddressSheetOpen = false
    @State private var isAuthModalOpen = false
    /// The list of ways to pay online, opened from "Pay online".
    @State private var isOnlineOpen = false

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

                        // 3. Payment: Razorpay's checkout (every way to pay it supports) or cash on delivery.
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Pay with")
                                .font(.dashitBodyBold)
                                .foregroundColor(.textPrimary)

                            if OnlinePayment.isAvailable {
                                onlineSection
                            }

                            paymentRow(title: "Cash on delivery", value: "cod") {
                                Image(systemName: "banknote")
                                    .font(.system(size: 18, weight: .medium))
                                    .foregroundColor(vm.paymentMethod == "cod" ? .brandOrange : .textMuted)
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
                            if !auth.isReadyToOrder {
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
                            Text(vm.isSubmitting
                                 ? vm.progressText
                                 : vm.paysOnline
                                    ? "Pay \(CurrencyFormatter.format(cart.bill.grandTotal))"
                                    : "Place Order • \(CurrencyFormatter.format(cart.bill.grandTotal))")
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
            // Signed-out shoppers log in or sign up, then come straight back here.
            .fullScreenCover(isPresented: $isAuthModalOpen) {
                AuthView { isAuthModalOpen = false }
            }
            // Close once signed in with a number and a name (a new account
            // gives its name in the same sheet first).
            .onChange(of: auth.isReadyToOrder) { _, isReady in
                if isReady {
                    isAuthModalOpen = false
                }
            }
        }
    }

    /// "Pay online", opening out into every way to pay online that Razorpay
    /// takes in India: the UPI apps on this phone, any UPI app or UPI ID,
    /// cards, netbanking, wallets, EMI and Pay Later. Closed, it says which.
    private var onlineSection: some View {
        let paysOnline = vm.paymentMethod != "cod"
        return VStack(alignment: .leading, spacing: 0) {
            Button {
                HapticsManager.shared.selection()
                withAnimation(.dashitSpring) {
                    isOnlineOpen.toggle()
                    if !paysOnline, let first = vm.payOptions.first { vm.paymentMethod = first.id }
                }
            } label: {
                HStack(spacing: 12) {
                    Image(systemName: vm.payOption?.symbol ?? "creditcard")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundColor(paysOnline ? .brandOrange : .textMuted)
                        .frame(width: 28, height: 28)
                    VStack(alignment: .leading, spacing: 1) {
                        Text("Pay online")
                            .font(paysOnline ? .dashitBodyBold : .dashitBody)
                            .foregroundColor(.textPrimary)
                        Text(paysOnline ? (vm.payOption?.title ?? "") : "UPI, cards, netbanking, wallets, EMI, Pay Later")
                            .font(.system(size: 12, weight: paysOnline ? .semibold : .regular))
                            .foregroundColor(paysOnline ? .brandAccent : .textMuted)
                            .lineLimit(1)
                    }
                    Spacer()
                    Text(isOnlineOpen ? "Done" : "Change")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.brandAccent)
                    Image(systemName: "chevron.down")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.textMuted)
                        .rotationEffect(.degrees(isOnlineOpen ? 180 : 0))
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 11)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(vm.isSubmitting)

            if isOnlineOpen {
                VStack(alignment: .leading, spacing: 6) {
                    let apps = vm.payOptions.filter { $0.upiApp != nil }
                    if !apps.isEmpty {
                        sectionLabel("UPI APPS ON THIS PHONE")
                        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3), spacing: 8) {
                            ForEach(apps) { app in
                                optionTile(app)
                            }
                        }
                    }
                    sectionLabel("MORE WAYS TO PAY")
                    ForEach(vm.payOptions.filter { $0.upiApp == nil }) { option in
                        optionRow(option)
                    }
                }
                .padding(.horizontal, 10)
                .padding(.bottom, 10)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .background(paysOnline ? Color.brandOrange.opacity(0.1) : Color.surfaceMuted, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(paysOnline ? Color.brandOrange.opacity(0.4) : .clear, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 10.5, weight: .heavy))
            .tracking(0.8)
            .foregroundColor(.textMuted)
            .padding(.leading, 4)
            .padding(.top, 6)
    }

    private func choose(_ option: PayOption) {
        HapticsManager.shared.selection()
        withAnimation(.dashitSpring) {
            vm.paymentMethod = option.id
            isOnlineOpen = false
        }
    }

    private func optionTile(_ option: PayOption) -> some View {
        let isSelected = vm.paymentMethod == option.id
        return Button { choose(option) } label: {
            VStack(spacing: 6) {
                Image(systemName: "indianrupeesign.circle.fill")
                    .font(.system(size: 24))
                    .foregroundColor(.brandAccent)
                Text(option.title)
                    .font(.system(size: 12, weight: isSelected ? .bold : .medium))
                    .foregroundColor(.textPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(isSelected ? Color.brandOrange : Color.hairline, lineWidth: 1.5)
            )
        }
        .buttonStyle(PressableButtonStyle(scale: 0.95))
    }

    private func optionRow(_ option: PayOption) -> some View {
        let isSelected = vm.paymentMethod == option.id
        return Button { choose(option) } label: {
            HStack(spacing: 12) {
                Image(systemName: option.symbol)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.brandAccent)
                    .frame(width: 32, height: 32)
                    .background(Color.brandOrange.opacity(0.12), in: Circle())
                VStack(alignment: .leading, spacing: 1) {
                    Text(option.title)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.textPrimary)
                    Text(option.subtitle)
                        .font(.system(size: 11.5))
                        .foregroundColor(.textMuted)
                        .lineLimit(1)
                }
                Spacer()
                Image(systemName: isSelected ? "largecircle.fill.circle" : "circle")
                    .foregroundColor(isSelected ? .brandOrange : .textFaint)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(isSelected ? Color.brandOrange : Color.hairline, lineWidth: 1.5)
            )
        }
        .buttonStyle(.plain)
    }

    /// One way to pay: its icon, its name, and a tick when chosen.
    private func paymentRow<Icon: View>(title: String, subtitle: String? = nil, value: String, @ViewBuilder icon: () -> Icon) -> some View {
        let isSelected = vm.paymentMethod == value
        return Button {
            withAnimation(.dashitSpring) {
                vm.paymentMethod = value
                isOnlineOpen = false
            }
            HapticsManager.shared.selection()
        } label: {
            HStack(spacing: 12) {
                icon()
                    .frame(width: 28, height: 28)
                VStack(alignment: .leading, spacing: 1) {
                    Text(title)
                        .font(isSelected ? .dashitBodyBold : .dashitBody)
                        .foregroundColor(.textPrimary)
                    if let subtitle {
                        Text(subtitle)
                            .font(.dashitMicro)
                            .foregroundColor(.textMuted)
                    }
                }
                Spacer()
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(isSelected ? .brandOrange : .gray)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(isSelected ? Color.brandOrange.opacity(0.1) : Color.surfaceMuted)
            .cornerRadius(10)
        }
        .buttonStyle(.plain)
        .disabled(vm.isSubmitting)
    }

    private var deliveryHeadline: String {
        guard let eta = StoreStatusStore.shared.etaMinutes(for: vm.deliveryQuote) else {
            return "Outside our delivery area"
        }
        return "Delivery in \(eta) minutes"
    }
}
