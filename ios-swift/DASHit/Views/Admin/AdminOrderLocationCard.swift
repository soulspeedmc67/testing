import SwiftUI
import MapKit

/// Where one order goes: the store, the customer's pin and the straight line
/// the distance is measured along, with how far it is and what the trip costs
/// the rider in petrol, so the shop can decide to deliver or cancel before
/// packing. (Web: `OrderLocationCard.jsx`.)
struct AdminOrderLocationCard: View {
    let order: Order
    let settings: NightCharge.Settings
    /// Given while the order can still be cancelled.
    var onCancel: (() -> Void)? = nil

    private var destination: CLLocationCoordinate2D { order.deliveryAddress.coordinate }

    /// The distance saved at checkout, or worked out from the pin.
    private var distanceKm: Double {
        if let saved = order.distanceKm, saved > 0 { return saved }
        return DeliveryEta.quote(for: destination).distanceKm
    }

    private var isFar: Bool { distanceKm > DeliveryEta.maxRadiusKm }

    /// Frames the store and the door with room around both.
    private var region: MKCoordinateRegion {
        let hub = DeliveryEta.hub
        return MKCoordinateRegion(
            center: CLLocationCoordinate2D(
                latitude: (hub.latitude + destination.latitude) / 2,
                longitude: (hub.longitude + destination.longitude) / 2
            ),
            span: MKCoordinateSpan(
                latitudeDelta: max(0.012, abs(hub.latitude - destination.latitude) * 1.8),
                longitudeDelta: max(0.012, abs(hub.longitude - destination.longitude) * 1.8)
            )
        )
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("Where it goes", systemImage: "mappin.and.ellipse")
                    .font(.system(size: 15, weight: .bold))
                Spacer()
                Text(String(format: "%.1f km", distanceKm) + (isFar ? " · Beyond 8 km" : " · Within 8 km"))
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(isFar ? .orange : .green)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background((isFar ? Color.orange : Color.green).opacity(0.14), in: Capsule())
            }

            Map(initialPosition: .region(region)) {
                MapPolyline(coordinates: [DeliveryEta.hub, destination])
                    .stroke(Color.primary.opacity(0.7), style: StrokeStyle(lineWidth: 3, lineCap: .round, dash: [2, 8]))
                Annotation("Store", coordinate: DeliveryEta.hub) {
                    BrandMapMarker(size: 30)
                }
                Annotation("Customer", coordinate: destination, anchor: .bottom) {
                    DestinationMapMarker()
                }
            }
            .frame(height: 220)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

            Text(order.deliveryAddress.formattedSummary)
                .font(.system(size: 14))
                .foregroundColor(.secondary)

            if let fuel = NightCharge.fuelCost(distanceKm: distanceKm, settings: settings) {
                HStack(spacing: 8) {
                    fact("From store", String(format: "%.1f km", distanceKm))
                    fact("Road, both ways", String(format: "%.1f km", fuel.roundTripKm))
                    fact("Rider's petrol", "about ₹\(fuel.rupees)")
                }
            }

            if order.nightDeliveryFee > 0 {
                Label("The customer paid a ₹\(Int(order.nightDeliveryFee)) distance charge on this order.", systemImage: "moon.fill")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.secondary)
            }

            HStack(spacing: 10) {
                Button {
                    openInMaps()
                } label: {
                    Label("Open in Maps", systemImage: "map")
                        .font(.system(size: 14, weight: .semibold))
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)

                if let onCancel {
                    Button(role: .destructive, action: onCancel) {
                        Label("Too far? Cancel", systemImage: "xmark.circle")
                            .font(.system(size: 14, weight: .semibold))
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }
            }
        }
        .padding(16)
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private func fact(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(.secondary)
            Text(value)
                .font(.system(size: 15, weight: .bold))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(Color(uiColor: .tertiarySystemFill))
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    /// Directions from wherever the phone is to the customer's pin, in Apple Maps.
    private func openInMaps() {
        guard let url = URL(string: "http://maps.apple.com/?daddr=\(destination.latitude),\(destination.longitude)&dirflg=d") else { return }
        UIApplication.shared.open(url)
    }
}
