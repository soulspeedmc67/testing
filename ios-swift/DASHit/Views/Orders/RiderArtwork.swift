import SwiftUI
import UIKit
import CoreLocation

/// The branded 3D rider, rendered every 15 degrees from one 3D model
/// (scripts/rider3d; the same 24 frames as Android, bundled in
/// Resources/MapArtwork). `rider_000` rides north, up the map, so its back
/// shows; the number is the heading clockwise from north. Picked to face the
/// way the rider travels.
enum RiderArtwork {
    static func imageName(for bearing: Double?) -> String {
        // No heading yet: the rider faces the shopper.
        guard let bearing else { return "rider_180" }
        let normalized = (bearing.truncatingRemainder(dividingBy: 360) + 360).truncatingRemainder(dividingBy: 360)
        let step = Int(((normalized + 7.5) / 15).rounded(.down)) % 24
        return String(format: "rider_%03d", step * 15)
    }

    /// Initial compass bearing from one point to another, in degrees.
    static func bearing(from a: CLLocationCoordinate2D, to b: CLLocationCoordinate2D) -> Double {
        let lat1 = a.latitude * .pi / 180
        let lat2 = b.latitude * .pi / 180
        let dLon = (b.longitude - a.longitude) * .pi / 180
        let y = sin(dLon) * cos(lat2)
        let x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLon)
        return atan2(y, x) * 180 / .pi
    }
}

/// The rider on the map: sprite facing the direction of travel over a soft
/// pulsing halo. Uses the GPS heading while moving, otherwise faces the door.
struct RiderMapMarker: View {
    let tracking: DriverLiveTracking
    let destination: CLLocationCoordinate2D?

    private var spriteName: String {
        if let heading = tracking.heading, (tracking.speed ?? 0) > 0.5 {
            return RiderArtwork.imageName(for: heading)
        }
        if let destination {
            return RiderArtwork.imageName(for: RiderArtwork.bearing(from: tracking.coordinate, to: destination))
        }
        return RiderArtwork.imageName(for: nil)
    }

    var body: some View {
        ZStack {
            Circle()
                .fill(Color.brandOrange.opacity(0.3))
                .frame(width: 54, height: 54)
                .phaseAnimator([false, true]) { halo, expanded in
                    halo
                        .scaleEffect(expanded ? 1.8 : 0.8)
                        .opacity(expanded ? 0 : 0.8)
                } animation: { _ in
                    .easeOut(duration: 1.6)
                }
                .offset(y: 22)

            Ellipse()
                .fill(Color.black.opacity(0.3))
                .frame(width: 52, height: 14)
                .blur(radius: 3)
                .offset(y: 22)

            if let sprite = UIImage(named: spriteName) {
                Image(uiImage: sprite)
                    .resizable()
                    .scaledToFit()
                    .frame(height: 88)
            } else {
                Image(systemName: "scooter")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(width: 44, height: 44)
                    .background(Circle().fill(Color.trackerCard))
            }
        }
        .frame(width: 104, height: 104)
        .animation(.easeInOut(duration: 0.3), value: spriteName)
        .accessibilityLabel("Delivery partner")
    }
}

/// The customer's door: an orange map pin with a house, casting a shadow.
struct DestinationMapMarker: View {
    var body: some View {
        VStack(spacing: -4) {
            ZStack {
                Circle()
                    .fill(Color.brandOrange)
                    .frame(width: 38, height: 38)
                    .overlay(Circle().strokeBorder(Color.white, lineWidth: 3))
                Image(systemName: "house.fill")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)
            }
            Triangle()
                .fill(Color.brandOrange)
                .frame(width: 14, height: 10)
            Ellipse()
                .fill(Color.black.opacity(0.25))
                .frame(width: 18, height: 6)
                .blur(radius: 1.5)
                .padding(.top, 5)
        }
        .shadow(color: .black.opacity(0.25), radius: 4, x: 0, y: 3)
        .accessibilityLabel("Delivery address")
    }

    private struct Triangle: Shape {
        func path(in rect: CGRect) -> Path {
            var path = Path()
            path.move(to: CGPoint(x: rect.minX, y: rect.minY))
            path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
            path.addLine(to: CGPoint(x: rect.midX, y: rect.maxY))
            path.closeSubpath()
            return path
        }
    }
}
