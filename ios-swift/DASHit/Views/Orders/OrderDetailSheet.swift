import SwiftUI

/// Receipt for one order: status, items, bill, address and payment, with
/// "Order again" at the bottom.
struct OrderDetailSheet: View {
    let order: Order
    var onReorder: () -> Void

    private var stage: DeliveryStage { order.status.stage }
    private var cardShape: RoundedRectangle { RoundedRectangle(cornerRadius: 14, style: .continuous) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(stage.headline(riderName: order.driverName))
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(.textPrimary)
                    Text("Order #\(order.id) · \(order.placedDateText)")
                        .font(.system(size: 13))
                        .foregroundColor(.textMuted)
                }

                if !stage.isFinished {
                    OrderProgressRail(stage: stage)
                        .padding(14)
                        .background(Color.trackerCard, in: cardShape)
                }

                section("Items") {
                    VStack(spacing: 0) {
                        ForEach(Array(order.items.enumerated()), id: \.offset) { index, item in
                            if index > 0 {
                                Rectangle().fill(Color.hairline).frame(height: 1)
                            }
                            HStack(spacing: 12) {
                                AsyncImage(url: URL(string: item.img)) { phase in
                                    if let image = phase.image {
                                        image.resizable().scaledToFill()
                                    } else {
                                        Color.surfaceMuted
                                    }
                                }
                                .frame(width: 44, height: 44)
                                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(item.name)
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundColor(.textPrimary)
                                        .lineLimit(2)
                                    Text("\(item.unit) × \(item.qty)")
                                        .font(.system(size: 12))
                                        .foregroundColor(.textMuted)
                                }
                                Spacer()
                                Text(CurrencyFormatter.format(item.price * Double(item.qty)))
                                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                                    .foregroundColor(.textPrimary)
                            }
                            .padding(.vertical, 10)
                        }
                    }
                }

                section("Bill") {
                    VStack(spacing: 8) {
                        billRow("Item total", CurrencyFormatter.format(order.subtotal))
                        billRow("Delivery fee", order.deliveryFee == 0 ? "FREE" : CurrencyFormatter.format(order.deliveryFee))
                        if order.discount > 0 {
                            billRow("Discount", "-\(CurrencyFormatter.format(order.discount))")
                        }
                        Rectangle().fill(Color.hairline).frame(height: 1)
                        HStack {
                            Text("Total")
                                .font(.system(size: 15, weight: .bold))
                            Spacer()
                            Text(CurrencyFormatter.format(order.grandTotal))
                                .font(.system(size: 16, weight: .bold, design: .rounded))
                        }
                        .foregroundColor(.textPrimary)
                    }
                }

                section("Delivered to") {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(order.deliveryAddress.nickname)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.textPrimary)
                        Text(order.deliveryAddress.formattedSummary)
                            .font(.system(size: 13))
                            .foregroundColor(.textMuted)
                        Text("Paid by \(order.paymentMethod)")
                            .font(.system(size: 13))
                            .foregroundColor(.textMuted)
                            .padding(.top, 4)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .padding(20)
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            Button {
                HapticsManager.shared.medium()
                onReorder()
            } label: {
                Label("Order again", systemImage: "arrow.clockwise")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(Color.brandOrange, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            .buttonStyle(.pressable)
            .disabled(order.items.isEmpty)
            .padding(.horizontal, 20)
            .padding(.top, 10)
            .padding(.bottom, 8)
            .background(Color.surface.ignoresSafeArea(edges: .bottom))
        }
        .dashitSheet([.fraction(0.85), .large])
    }

    private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.textMuted)
            content()
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .dashitCard(cardShape)
        }
    }

    private func billRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label)
                .foregroundColor(.textMuted)
            Spacer()
            Text(value)
                .foregroundColor(.textPrimary)
        }
        .font(.system(size: 13))
    }
}
