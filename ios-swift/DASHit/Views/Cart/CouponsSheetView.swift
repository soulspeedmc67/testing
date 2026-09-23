import SwiftUI

struct CouponsSheetView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var cart = CartViewModel.shared
    
    let availableCoupons: [Coupon] = [
        Coupon(
            id: "c-freedel",
            code: "FREEDEL",
            title: "Free Delivery",
            description: "Waives ₹25 delivery partner fee on any order.",
            discount: 25,
            minOrder: 0,
            waivesDelivery: true
        ),
        Coupon(
            id: "c-crisp20",
            code: "CRISP20",
            title: "20% Off on Snacks",
            description: "Get 20% off on snacks & drinks up to ₹80 on orders above ₹199.",
            discount: 50,
            minOrder: 199
        ),
        Coupon(
            id: "c-fresh25",
            code: "FRESH25",
            title: "Save ₹75 on Fresh Groceries",
            description: "Flat ₹75 discount on orders above ₹299 for fresh milk, fruits & staples.",
            discount: 75,
            minOrder: 299
        ),
        Coupon(
            id: "c-dashit100",
            code: "DASHIT100",
            title: "Super Saver ₹100 Off",
            description: "Save ₹100 on large household grocery orders above ₹499.",
            discount: 100,
            minOrder: 499
        )
    ]
    
    var body: some View {
        NavigationStack {
            ZStack {
                Color.surface.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 12) {
                        ForEach(availableCoupons) { coupon in
                            let isEligible = cart.bill.subtotal >= coupon.minOrder
                            let isCurrentlyApplied = cart.appliedCoupon?.code == coupon.code
                            
                            VStack(alignment: .leading, spacing: 10) {
                                HStack {
                                    HStack(spacing: 6) {
                                        Image(systemName: "ticket.fill")
                                            .foregroundColor(.caution)
                                        Text(coupon.code)
                                            .font(.dashitHeadline)
                                            .foregroundColor(.textPrimary)
                                    }
                                    
                                    Spacer()
                                    
                                    if isCurrentlyApplied {
                                        Text("APPLIED")
                                            .font(.dashitCaptionBold)
                                            .foregroundColor(.brandAccent)
                                            .padding(.horizontal, 10)
                                            .padding(.vertical, 5)
                                            .background(Color.brandOrange.opacity(0.15))
                                            .cornerRadius(6)
                                    } else {
                                        Button(action: {
                                            if isEligible {
                                                cart.applyCoupon(coupon)
                                                dismiss()
                                            } else {
                                                HapticsManager.shared.warning()
                                            }
                                        }) {
                                            Text("APPLY")
                                                .font(.dashitCaptionBold)
                                                .foregroundColor(isEligible ? .brandOrange : .gray)
                                                .padding(.horizontal, 14)
                                                .padding(.vertical, 6)
                                                .background(isEligible ? Color.brandOrange.opacity(0.15) : Color.gray.opacity(0.1))
                                                .cornerRadius(6)
                                        }
                                        .disabled(!isEligible)
                                    }
                                }
                                
                                Text(coupon.description)
                                    .font(.dashitBody)
                                    .foregroundColor(.textMuted)
                                
                                if !isEligible {
                                    Text("Add \(CurrencyFormatter.format(coupon.minOrder - cart.bill.subtotal)) more to unlock")
                                        .font(.dashitMicro)
                                        .foregroundColor(.caution)
                                }
                            }
                            .padding(14)
                            .background(Color.surfaceRaised)
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(isCurrentlyApplied ? Color.brandOrange : Color.hairline, lineWidth: 1)
                            )
                        }
                    }
                    .padding(16)
                }
            }
            .navigationTitle("Coupons & Offers")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundColor(.brandAccent)
                }
            }
        }
    }
}
