import SwiftUI

/// Coupons & offers with the store's real codes: a code field, then ticket
/// cards ordered by what they save on this cart, each saying exactly what it
/// takes off or how much more unlocks it.
struct CouponsSheetView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var cart = CartViewModel.shared
    @State private var enteredCode = ""
    @State private var codeError: String? = nil
    @FocusState private var isCodeFocused: Bool

    private var subtotal: Double { cart.bill.subtotal }
    private var bestCode: String? { Coupon.best(forSubtotal: subtotal)?.code }

    /// Codes that save something first (biggest first), then the rest, closest
    /// to unlocking first.
    private var orderedCoupons: [Coupon] {
        Coupon.catalog.sorted { a, b in
            let savingA = a.saving(onSubtotal: subtotal)
            let savingB = b.saving(onSubtotal: subtotal)
            if (savingA > 0) != (savingB > 0) { return savingA > 0 }
            if savingA != savingB { return savingA > savingB }
            return a.minOrder < b.minOrder
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    codeField

                    VStack(alignment: .leading, spacing: 12) {
                        Text("Available offers")
                            .font(.system(size: 17, weight: .bold))
                            .foregroundColor(.textPrimary)
                        ForEach(orderedCoupons) { coupon in
                            CouponTicket(
                                coupon: coupon,
                                subtotal: subtotal,
                                isApplied: cart.appliedCoupon?.code == coupon.code,
                                isBest: coupon.code == bestCode,
                                onApply: { apply(coupon) },
                                onRemove: { cart.removeCoupon() }
                            )
                        }
                    }
                }
                .padding(16)
                .animation(.dashitSpring, value: cart.appliedCoupon?.code)
            }
            .scrollDismissesKeyboard(.immediately)
            .background(Color.surface.ignoresSafeArea())
            .navigationTitle("Coupons & offers")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.surface, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .fontWeight(.semibold)
                        .foregroundColor(.brandAccent)
                }
            }
        }
    }

    // MARK: - Code entry

    private var codeField: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 10) {
                Image(systemName: "tag")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(.textMuted)
                TextField("", text: $enteredCode, prompt: Text("Enter offer code").foregroundColor(.textFaint))
                    .font(.system(size: 15, weight: .semibold, design: .monospaced))
                    .foregroundColor(.textPrimary)
                    .tint(.brandOrange)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .submitLabel(.done)
                    .focused($isCodeFocused)
                    .onSubmit(applyEnteredCode)
                    .onChange(of: enteredCode) { _, value in
                        codeError = nil
                        let upper = value.uppercased()
                        if upper != value { enteredCode = upper }
                    }
                Button("Apply", action: applyEnteredCode)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(enteredCode.isEmpty ? .textFaint : .brandAccent)
                    .disabled(enteredCode.isEmpty)
            }
            .padding(.horizontal, 14)
            .frame(height: 52)
            .dashitCard(cornerRadius: 14)

            if let codeError {
                Label(codeError, systemImage: "exclamationmark.circle.fill")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.danger)
                    .transition(.opacity)
            } else {
                Text("Cart value \(CurrencyFormatter.format(subtotal))")
                    .font(.system(size: 12))
                    .foregroundColor(.textMuted)
            }
        }
        .animation(.dashitSnappy, value: codeError)
    }

    // MARK: - Actions

    private func applyEnteredCode() {
        guard let coupon = Coupon.find(code: enteredCode) else {
            codeError = "That offer code isn't valid."
            HapticsManager.shared.warning()
            return
        }
        guard subtotal >= coupon.minOrder else {
            codeError = "Add \(CurrencyFormatter.format(coupon.minOrder - subtotal)) more to use \(coupon.code)."
            HapticsManager.shared.warning()
            return
        }
        isCodeFocused = false
        apply(coupon)
    }

    private func apply(_ coupon: Coupon) {
        cart.applyCoupon(coupon)
        guard cart.appliedCoupon?.code == coupon.code else { return }
        Task {
            try? await Task.sleep(for: .milliseconds(450))
            dismiss()
        }
    }
}

/// One offer as a ticket: a coloured stub with the saving, a perforated edge,
/// and the code, terms and state on the right.
private struct CouponTicket: View {
    let coupon: Coupon
    let subtotal: Double
    let isApplied: Bool
    let isBest: Bool
    let onApply: () -> Void
    let onRemove: () -> Void

    private static let stubWidth: CGFloat = 84

    private var isUnlocked: Bool { subtotal >= coupon.minOrder }
    private var saving: Double { coupon.saving(onSubtotal: subtotal) }
    private var shortfall: Double { max(0, coupon.minOrder - subtotal) }

    var body: some View {
        let shape = TicketShape(notchX: Self.stubWidth)

        HStack(spacing: 0) {
            stub
                .frame(width: Self.stubWidth)
                .frame(maxHeight: .infinity)
                .background(isUnlocked ? Color.brandOrange : Color.surfaceMuted)
            details
                .padding(.leading, 16)
                .padding(.trailing, 14)
                .padding(.vertical, 14)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .fixedSize(horizontal: false, vertical: true)
        .background(Color.surfaceRaised)
        .clipShape(shape)
        .overlay(
            shape.strokeBorder(
                isApplied ? Color.positive : Color.hairline,
                lineWidth: isApplied ? 1.5 : 1
            )
        )
        .overlay(alignment: .leading) {
            VerticalLine()
                .stroke(Color.surface, style: StrokeStyle(lineWidth: 1.5, dash: [4, 4]))
                .frame(width: 1.5)
                .padding(.vertical, 12)
                .offset(x: Self.stubWidth - 0.75)
        }
        .contentShape(shape)
        .onTapGesture {
            if isApplied {
                return
            }
            if isUnlocked {
                onApply()
            } else {
                HapticsManager.shared.warning()
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(coupon.code). \(coupon.title). \(statusText)")
    }

    private var stub: some View {
        VStack(spacing: 1) {
            if coupon.waivesDelivery == true {
                Text("FREE")
                    .font(.system(size: 19, weight: .black, design: .rounded))
                Text("DELIVERY")
                    .font(.system(size: 9.5, weight: .heavy))
                    .tracking(0.8)
            } else {
                Text("₹\(Int(coupon.discount))")
                    .font(.system(size: 24, weight: .black, design: .rounded))
                Text("OFF")
                    .font(.system(size: 11, weight: .heavy))
                    .tracking(1.4)
            }
        }
        .foregroundColor(isUnlocked ? .white : .textMuted)
        .minimumScaleFactor(0.8)
        .padding(.horizontal, 6)
    }

    private var details: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(alignment: .center, spacing: 8) {
                Text(coupon.code)
                    .font(.system(size: 13, weight: .bold, design: .monospaced))
                    .foregroundColor(.textPrimary)
                    .padding(.horizontal, 8)
                    .frame(height: 24)
                    .overlay(
                        RoundedRectangle(cornerRadius: 6, style: .continuous)
                            .strokeBorder(Color.hairlineStrong, style: StrokeStyle(lineWidth: 1, dash: [3, 3]))
                    )
                if isBest && !isApplied {
                    Text("BEST FOR YOU")
                        .font(.system(size: 10, weight: .heavy))
                        .tracking(0.6)
                        .foregroundColor(.positive)
                }
                Spacer(minLength: 4)
                action
            }

            Text(coupon.title)
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.textPrimary)
                .fixedSize(horizontal: false, vertical: true)

            Text(statusText)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(statusColor)
                .fixedSize(horizontal: false, vertical: true)

            if !isUnlocked {
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Color.surfaceMuted)
                        Capsule()
                            .fill(Color.caution)
                            .frame(width: geo.size.width * CGFloat(min(subtotal / max(coupon.minOrder, 1), 1)))
                    }
                }
                .frame(height: 4)
                .padding(.top, 2)
            }
        }
    }

    @ViewBuilder
    private var action: some View {
        if isApplied {
            Button(action: onRemove) {
                Text("Remove")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.danger)
            }
            .buttonStyle(.pressable)
        } else if isUnlocked {
            Button(action: onApply) {
                Text("APPLY")
                    .font(.system(size: 13, weight: .heavy))
                    .tracking(0.4)
                    .foregroundColor(.brandAccent)
            }
            .buttonStyle(.pressable)
        } else {
            Image(systemName: "lock.fill")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.textFaint)
        }
    }

    private var statusText: String {
        if isApplied {
            return saving > 0 ? "Applied · you save \(CurrencyFormatter.format(saving))" : "Applied"
        }
        if !isUnlocked {
            return "Add \(CurrencyFormatter.format(shortfall)) more to unlock"
        }
        if saving > 0 {
            return "You save \(CurrencyFormatter.format(saving)) on this order"
        }
        return coupon.waivesDelivery == true ? "Delivery is already free on this order" : coupon.description
    }

    private var statusColor: Color {
        if isApplied || (isUnlocked && saving > 0) { return .positive }
        return isUnlocked ? .textMuted : .caution
    }
}

/// A card with two semicircular notches where the stub meets the body.
struct TicketShape: InsettableShape {
    var notchX: CGFloat
    var notchRadius: CGFloat = 8
    var cornerRadius: CGFloat = 16
    var insetAmount: CGFloat = 0

    func path(in rect: CGRect) -> Path {
        let r = rect.insetBy(dx: insetAmount, dy: insetAmount)
        let corner = max(0, cornerRadius - insetAmount)
        let notch = notchRadius + insetAmount
        let x = rect.minX + notchX

        var path = Path()
        path.move(to: CGPoint(x: r.minX + corner, y: r.minY))
        path.addLine(to: CGPoint(x: x - notch, y: r.minY))
        path.addRelativeArc(center: CGPoint(x: x, y: r.minY), radius: notch, startAngle: .degrees(180), delta: .degrees(-180))
        path.addLine(to: CGPoint(x: r.maxX - corner, y: r.minY))
        path.addArc(tangent1End: CGPoint(x: r.maxX, y: r.minY), tangent2End: CGPoint(x: r.maxX, y: r.minY + corner), radius: corner)
        path.addLine(to: CGPoint(x: r.maxX, y: r.maxY - corner))
        path.addArc(tangent1End: CGPoint(x: r.maxX, y: r.maxY), tangent2End: CGPoint(x: r.maxX - corner, y: r.maxY), radius: corner)
        path.addLine(to: CGPoint(x: x + notch, y: r.maxY))
        path.addRelativeArc(center: CGPoint(x: x, y: r.maxY), radius: notch, startAngle: .degrees(0), delta: .degrees(-180))
        path.addLine(to: CGPoint(x: r.minX + corner, y: r.maxY))
        path.addArc(tangent1End: CGPoint(x: r.minX, y: r.maxY), tangent2End: CGPoint(x: r.minX, y: r.maxY - corner), radius: corner)
        path.addLine(to: CGPoint(x: r.minX, y: r.minY + corner))
        path.addArc(tangent1End: CGPoint(x: r.minX, y: r.minY), tangent2End: CGPoint(x: r.minX + corner, y: r.minY), radius: corner)
        path.closeSubpath()
        return path
    }

    func inset(by amount: CGFloat) -> TicketShape {
        var copy = self
        copy.insetAmount += amount
        return copy
    }
}

/// A vertical line down the middle of its frame, for dashed separators.
struct VerticalLine: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.midX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.midX, y: rect.maxY))
        return path
    }
}
