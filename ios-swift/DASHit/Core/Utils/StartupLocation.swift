import Foundation
import CoreLocation

/// The first time the shop opens with no delivery address, asks for location
/// (When In Use) and, if allowed, sets the delivery address to where the
/// shopper is, as Blinkit does. The shopper can change it any time from the
/// address at the top of the home screen.
@MainActor
final class StartupLocation: NSObject, CLLocationManagerDelegate {
    static let shared = StartupLocation()

    private let manager = CLLocationManager()
    private var isAsking = false

    private override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyNearestTenMeters
    }

    /// Once per launch, and only while there's no address to deliver to.
    func askIfNeeded() {
        guard !isAsking, AddressBook.shared.current == nil else { return }
        switch manager.authorizationStatus {
        case .notDetermined:
            isAsking = true
            manager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse, .authorizedAlways:
            isAsking = true
            manager.requestLocation()
        default:
            // Said no before: they pick the address themselves.
            break
        }
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        Task { @MainActor in
            guard self.isAsking else { return }
            switch status {
            case .authorizedWhenInUse, .authorizedAlways:
                self.manager.requestLocation()
            case .denied, .restricted:
                self.isAsking = false
            default:
                break
            }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        Task { @MainActor in
            await self.useAsAddress(location)
            self.isAsking = false
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in self.isAsking = false }
    }

    /// Names the spot like the map picker does ("Court Road, Lal Chowk, Anantnag").
    private func useAsAddress(_ location: CLLocation) async {
        guard AddressBook.shared.current == nil else { return }
        let placemark = try? await CLGeocoder().reverseGeocodeLocation(location).first
        let parts = [
            [placemark?.subThoroughfare, placemark?.thoroughfare].compactMap { $0 }.joined(separator: " "),
            placemark?.subLocality ?? "",
            placemark?.locality ?? ""
        ]
        let line = parts.filter { !$0.isEmpty }.joined(separator: ", ")
        // The shopper may have picked an address while this was working.
        guard AddressBook.shared.current == nil else { return }
        AddressBook.shared.use(
            DeliveryAddress(
                nickname: "Current location",
                street: line.isEmpty ? (placemark?.name ?? "Current location") : line,
                latitude: location.coordinate.latitude,
                longitude: location.coordinate.longitude
            )
        )
    }
}
