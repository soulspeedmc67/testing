import SwiftUI

/// The whole bill of one order, line by line, as the customer was charged:
/// items, delivery, the night and extra charges, handling, any discount and
/// the total. (Web: the "Bill" card in `OrderDetailDrawer.jsx`.)
struct AdminOrderBillCard: View {
    let order: Order

    private var unitCount: Int { order.items.reduce(0) { $0 + $1.quantity } }

    /// What is left of the total once items, delivery and discount are
    /// counted: the handling charge (orders don't all save it by name).
    private var handlingCharge: Double {
        max(0, (order.grandTotal - order.subtotal - order.deliveryFee + order.discount).rounded())
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Bill")
                    .font(.system(size: 15, weight: .bold))
                Spacer()
                Text(order.isPaidOnline ? "Paid online" : "Cash on delivery")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(order.isPaidOnline ? .green : .orange)
            }

            row("Items (\(unitCount))", CurrencyFormatter.format(order.subtotal))
            if order.nightDeliveryFee > 0 && order.baseDeliveryFee == 0 {
                row("Delivery (by distance)", CurrencyFormatter.format(order.nightDeliveryFee))
            } else {
                row("Delivery", order.baseDeliveryFee > 0 ? CurrencyFormatter.format(order.baseDeliveryFee) : "Free")
                if order.nightDeliveryFee > 0 {
                    row("Night distance charge", CurrencyFormatter.format(order.nightDeliveryFee))
                }
            }
            if order.extraDeliveryFee > 0 {
                row(ShopRules.extraChargeTitle(order.extraDeliveryLabel), CurrencyFormatter.format(order.extraDeliveryFee))
            }
            if handlingCharge > 0 {
                row("Handling charge", CurrencyFormatter.format(handlingCharge))
            }
            if order.discount > 0 {
                row("Discount" + (order.couponCode.map { " (\($0))" } ?? ""), "-\(CurrencyFormatter.format(order.discount))")
            }

            Divider()

            HStack(alignment: .firstTextBaseline) {
                Text("Customer pays")
                    .font(.system(size: 16, weight: .bold))
                Spacer()
                Text(CurrencyFormatter.format(order.grandTotal))
                    .font(.system(size: 20, weight: .heavy, design: .rounded))
                    .monospacedDigit()
            }

            Text(order.isPaidOnline
                ? "Already paid online. The rider collects nothing."
                : "The rider collects \(CurrencyFormatter.format(order.grandTotal)) at the door.")
                .font(.system(size: 13))
                .foregroundColor(.secondary)
        }
        .padding(16)
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .accessibilityElement(children: .combine)
    }

    private func row(_ label: String, _ value: String) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(label)
                .font(.system(size: 14))
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .font(.system(size: 14, weight: .semibold))
                .monospacedDigit()
        }
    }
}
