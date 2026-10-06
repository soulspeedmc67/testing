import SwiftUI

struct CheckoutView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var vm = CheckoutViewModel()
    @ObservedObject private var cart = CartViewModel.shared
    @ObservedObject private var auth = AuthService.shared
    @ObservedObject private var storeStatus = StoreStatusStore.shared
    @State private var isAddressSheetOpen = false
    @State private var isAuthModalOpen = false
    /// The list of ways to pay online, opened from "Pay online".
    @State private var isOnlineOpen = false
    /// Refreshed every 30 seconds, so cash on delivery stops at 8 pm on a
    /// checkout that was opened before it.
    @State private var clock = Date()

    /// Cash on delivery as the shop has set it (`ShopRules`): on or off, and
    /// whether it is taken at night.
    private var cashAllowed: Bool { storeStatus.rules.allowsCash(at: clock) }
    /// The cart is under the shop's minimum order.
    private var belowMinimum: Bool { !cart.items.isEmpty && !cart.bill.isMinOrderSatisfied }

    private var placeOrderLabel: String {
        if vm.isSubmitting { return vm.progressText }
        if belowMinimum {
            return "Add \(CurrencyFormatter.format(cart.bill.amountNeededForMinOrder)) more to order"
        }
        let total = CurrencyFormatter.format(cart.bill.grandTotal)
        if !vm.paysOnline { return "Place order · \(total) cash" }
        if vm.payOption?.upiApp != nil { return "Pay \(total) with \(vm.payOption?.title ?? "")" }
        return "Pay \(total)"
    }

    var body: some View {
        NavigationStack {
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
                                .foregroundColor(vm.deliveryQuote.isDeliverable ? .textPrimary : .brandOrange)
                            Text(vm.deliveryQuote.isDeliverable
                                 ? "\(vm.deliveryQuote.distanceText) · Fulfilled from DASHit Anantnag Dark Store"
                                 : "\(vm.deliveryQuote.distanceText) · Standard delivery is within 8 km (Store will confirm)")
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

                    // 3. How to pay: UPI apps as logo tiles, then the other online ways, then cash.
                    paymentSection

                    // 4. Order Bill Summary – fully visible above the Place Order button
                    VStack(spacing: 8) {
                        let bill = cart.bill
                        billRow("Items total", value: CurrencyFormatter.format(bill.subtotal))
                        billRow(
                            bill.isFirstFivePromo ? "Delivery (free – first 5 orders)" : "Delivery fee",
                            value: bill.deliveryFee == 0 ? "FREE" : CurrencyFormatter.format(bill.deliveryFee),
                            accent: bill.deliveryFee == 0
                        )
                        if !bill.tierLabel.isEmpty && bill.deliveryFee > 0 {
                            Text(bill.tierLabel)
                                .font(.system(size: 11))
                                .foregroundColor(.textFaint)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        // Charged by distance after 8 pm, or whenever the shop switches it on.
                        if bill.nightDeliveryFee > 0 {
                            billRow(
                                NightCharge.isNightHours() ? "Night delivery charge" : "Distance delivery charge",
                                value: CurrencyFormatter.format(bill.nightDeliveryFee)
                            )
                            Text(nightChargeNote)
                                .font(.system(size: 11))
                                .foregroundColor(.textFaint)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        billRow("Handling charge", value: CurrencyFormatter.format(bill.handlingFee))
                        if bill.couponDiscount > 0 {
                            billRow("Coupon discount", value: "-\(CurrencyFormatter.format(bill.couponDiscount))", accent: true)
                        }
                        Divider()
                        HStack {
                            Text("Order Total")
                                .font(.dashitBodyBold)
                                .foregroundColor(.textPrimary)
                            Spacer()
                            Text(CurrencyFormatter.format(bill.grandTotal))
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
            .background(Color.surface.ignoresSafeArea())
            // Place Order button sits in the safe area – scroll content is NEVER hidden behind it.
            .safeAreaInset(edge: .bottom, spacing: 0) {
                VStack(spacing: 8) {
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
                            Text(placeOrderLabel)
                                .font(.dashitBodyBold)
                                .foregroundColor(.white)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(16)
                        .background(vm.isSubmitting || belowMinimum ? Color.gray : Color.brandOrange)
                        .cornerRadius(14)
                    }
                    .disabled(vm.isSubmitting || cart.items.isEmpty || belowMinimum)
                    .padding(.horizontal, 16)
                    .padding(.bottom, 12)
                }
                .background(Color.surface.ignoresSafeArea(edges: .bottom))
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
                    // Free first orders depend on how many this account has had.
                    Task { await cart.loadOrdersCount(uid: auth.firebaseUID) }
                }
            }
            // Free first orders depend on how many this account has had.
            .task {
                await cart.loadOrdersCount(uid: auth.firebaseUID)
            }
            // The night charge changes with the hour, the address and the
            // shop's switch, so the bill is brought up to date for all three.
            .task {
                while !Task.isCancelled {
                    clock = Date()
                    cart.refreshNightFee(for: vm.selectedAddress, settings: storeStatus.nightCharge)
                    try? await Task.sleep(for: .seconds(30))
                }
            }
            .onChange(of: vm.selectedAddress) { _, address in
                cart.refreshNightFee(for: address, settings: storeStatus.nightCharge)
            }
            .onChange(of: storeStatus.nightCharge) { _, settings in
                cart.refreshNightFee(for: vm.selectedAddress, settings: settings)
            }
        }
    }

    private var nightChargeNote: String {
        let rule = NightCharge.isNightHours() ? "After 8 pm, by distance" : "By distance"
        return "\(rule): \(vm.deliveryQuote.shortDistanceText) from our store"
    }

    private func billRow(_ label: String, value: String, accent: Bool = false) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 13))
                .foregroundColor(.textMuted)
            Spacer()
            Text(value)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(accent ? .positive : .textPrimary)
        }
    }


    /// How to pay, laid out the way shoppers expect from Blinkit or Zomato:
    /// the UPI apps on this phone first as logo tiles, then cards and the
    /// other online ways (wallets, Pay Later and EMI one tap away), then cash.
    private var paymentSection: some View {
        let apps = OnlinePayment.isAvailable ? vm.payOptions.filter { $0.upiApp != nil } : []
        let others = OnlinePayment.isAvailable ? vm.payOptions.filter { $0.upiApp == nil } : []
        let shown = others.filter { ["upi", "card", "netbanking"].contains($0.method) }
        let more = others.filter { !["upi", "card", "netbanking"].contains($0.method) }
        return VStack(alignment: .leading, spacing: 10) {
            Text("Pay with")
                .font(.system(size: 17, weight: .heavy))
                .foregroundColor(.textPrimary)

            if !apps.isEmpty {
                payGroup("UPI apps", note: "Opens your app") {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 4), spacing: 8) {
                        ForEach(apps) { app in appTile(app) }
                    }
                    .padding(.horizontal, 10)
                    .padding(.bottom, 10)
                }
            }

            if !others.isEmpty {
                payGroup("More ways to pay") {
                    VStack(spacing: 0) {
                        ForEach(Array((shown + (isOnlineOpen ? more : [])).enumerated()), id: \.element.id) { index, option in
                            if index > 0 { payDivider }
                            optionRow(option)
                        }
                        if !isOnlineOpen && !more.isEmpty {
                            payDivider
                            Button {
                                withAnimation(.dashitSpring) { isOnlineOpen = true }
                            } label: {
                                HStack {
                                    Text("Wallets, Pay Later, EMI")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(.brandAccent)
                                    Spacer()
                                    Image(systemName: "chevron.down")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(.brandAccent)
                                }
                                .padding(.horizontal, 14)
                                .padding(.vertical, 13)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }

            payGroup("Pay on delivery") {
                Button { choose(id: "cod") } label: {
                    HStack(spacing: 12) {
                        methodBadge("banknote")
                        VStack(alignment: .leading, spacing: 1) {
                            Text("Cash on delivery")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(.textPrimary)
                            Text(storeStatus.rules.cashUnavailableNote(at: clock)
                                 ?? "Pay the rider in cash or by UPI at your door")
                                .font(.system(size: 12))
                                .foregroundColor(.textMuted)
                        }
                        Spacer()
                        selectionMark(cashAllowed && vm.paymentMethod == "cod")
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .contentShape(Rectangle())
                    .opacity(cashAllowed ? 1 : 0.5)
                }
                .buttonStyle(.plain)
                .disabled(!cashAllowed)
            }
        }
        .disabled(vm.isSubmitting)
        .onAppear {
            leaveCashIfOff()
            // Open already when the saved choice is one of the folded-away ways.
            if more.contains(where: { $0.id == vm.paymentMethod }) { isOnlineOpen = true }
        }
        .onChange(of: cashAllowed) { _, _ in
            leaveCashIfOff()
        }
    }

    private func payGroup<Content: View>(_ title: String, note: String? = nil, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text(title.uppercased())
                    .font(.system(size: 11, weight: .heavy))
                    .tracking(0.8)
                    .foregroundColor(.textMuted)
                Spacer()
                if let note {
                    Text(note)
                        .font(.system(size: 11))
                        .foregroundColor(.textFaint)
                }
            }
            .padding(.horizontal, 14)
            .padding(.top, 12)
            .padding(.bottom, 6)
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(Color.hairline, lineWidth: 1))
    }

    private var payDivider: some View {
        Rectangle()
            .fill(Color.hairlineSoft)
            .frame(height: 1)
            .padding(.leading, 62)
    }

    /// Cash on delivery isn't being taken (switched off, or it is night): move
    /// to the first way to pay online.
    private func leaveCashIfOff() {
        guard !cashAllowed, vm.paymentMethod == "cod", let first = vm.payOptions.first else { return }
        withAnimation(.dashitSpring) { vm.paymentMethod = first.id }
    }

    private func choose(id: String) {
        HapticsManager.shared.selection()
        withAnimation(.dashitSpring) { vm.paymentMethod = id }
    }

    /// Filled orange circle with a tick when picked; an empty ring when not.
    private func selectionMark(_ selected: Bool) -> some View {
        ZStack {
            Circle()
                .fill(selected ? Color.brandOrange : Color.clear)
            Circle()
                .strokeBorder(selected ? Color.brandOrange : Color.hairlineStrong, lineWidth: 1.5)
            if selected {
                Image(systemName: "checkmark")
                    .font(.system(size: 11, weight: .heavy))
                    .foregroundColor(.white)
            }
        }
        .frame(width: 22, height: 22)
    }

    private func methodBadge(_ symbol: String) -> some View {
        Image(systemName: symbol)
            .font(.system(size: 16, weight: .semibold))
            .foregroundColor(.textSecondary)
            .frame(width: 36, height: 36)
            .background(Color.surfaceMuted, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private func appTile(_ option: PayOption) -> some View {
        let isSelected = vm.paymentMethod == option.id
        return Button { choose(id: option.id) } label: {
            VStack(spacing: 7) {
                ZStack {
                    RoundedRectangle(cornerRadius: 13, style: .continuous)
                        .fill(Color.white)
                        .overlay(RoundedRectangle(cornerRadius: 13, style: .continuous).strokeBorder(Color.hairline, lineWidth: 1))
                    if let logo = option.logo {
                        Image(logo)
                            .resizable()
                            .scaledToFit()
                            .frame(width: 40, height: 40)
                            .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
                    } else {
                        Image(systemName: option.symbol)
                            .font(.system(size: 22))
                            .foregroundColor(.brandAccent)
                    }
                }
                .frame(width: 48, height: 48)
                Text(option.title)
                    .font(.system(size: 11.5, weight: isSelected ? .bold : .medium))
                    .foregroundColor(isSelected ? .brandAccent : .textPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(isSelected ? Color.brandOrange.opacity(0.1) : Color.clear, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(isSelected ? Color.brandOrange : .clear, lineWidth: 1.5))
        }
        .buttonStyle(PressableButtonStyle(scale: 0.94))
        .accessibilityLabel(option.title)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    private func optionRow(_ option: PayOption) -> some View {
        Button { choose(id: option.id) } label: {
            HStack(spacing: 12) {
                methodBadge(option.symbol)
                VStack(alignment: .leading, spacing: 1) {
                    Text(option.title)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.textPrimary)
                    Text(option.subtitle)
                        .font(.system(size: 12))
                        .foregroundColor(.textMuted)
                        .lineLimit(1)
                }
                Spacer()
                selectionMark(vm.paymentMethod == option.id)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private var deliveryHeadline: String {
        guard let eta = StoreStatusStore.shared.etaMinutes(for: vm.deliveryQuote) else {
            return "Outside our delivery area"
        }
        return "Delivery in \(eta) minutes"
    }
}
