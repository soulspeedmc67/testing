import Foundation
import MapKit

/// The road path between two points, for drawing the ride on the live map.
/// Apple Maps first; where it has no directions (it often has none around
/// Anantnag) the OSRM router the web map and the driver app already use
/// (`src/lib/maps.js`). nil only when neither can be reached.
@MainActor
enum RoadRouter {
    /// Set once Apple Maps has answered "no directions" here, so later
    /// re-routes in the same session go straight to OSRM.
    private static var skipsAppleMaps = false

    static func path(from origin: CLLocationCoordinate2D, to destination: CLLocationCoordinate2D) async -> [CLLocationCoordinate2D]? {
        if !skipsAppleMaps, let path = await appleMapsPath(from: origin, to: destination) {
            return joined(path, from: origin, to: destination)
        }
        guard !Task.isCancelled else { return nil }
        if let path = await osrmPath(from: origin, to: destination) {
            return joined(path, from: origin, to: destination)
        }
        return nil
    }

    private static func appleMapsPath(from origin: CLLocationCoordinate2D, to destination: CLLocationCoordinate2D) async -> [CLLocationCoordinate2D]? {
        let request = MKDirections.Request()
        request.source = MKMapItem(placemark: MKPlacemark(coordinate: origin))
        request.destination = MKMapItem(placemark: MKPlacemark(coordinate: destination))
        request.transportType = .automobile
        do {
            let response = try await MKDirections(request: request).calculate()
            guard let polyline = response.routes.first?.polyline, polyline.pointCount > 1 else { return nil }
            var coordinates = [CLLocationCoordinate2D](repeating: kCLLocationCoordinate2DInvalid, count: polyline.pointCount)
            polyline.getCoordinates(&coordinates, range: NSRange(location: 0, length: polyline.pointCount))
            return coordinates
        } catch let error as MKError where error.code == .directionsNotFound {
            skipsAppleMaps = true
            return nil
        } catch {
            return nil
        }
    }

    private struct OSRMResponse: Decodable {
        struct Route: Decodable {
            struct Geometry: Decodable {
                /// GeoJSON order: [longitude, latitude].
                let coordinates: [[Double]]
            }
            let geometry: Geometry
        }
        let code: String
        let routes: [Route]?
    }

    private static func osrmPath(from origin: CLLocationCoordinate2D, to destination: CLLocationCoordinate2D) async -> [CLLocationCoordinate2D]? {
        let points = "\(origin.longitude),\(origin.latitude);\(destination.longitude),\(destination.latitude)"
        guard let url = URL(string: "https://router.project-osrm.org/route/v1/driving/\(points)?overview=full&geometries=geojson") else {
            return nil
        }
        let request = URLRequest(url: url, timeoutInterval: 6)
        guard let (data, response) = try? await URLSession.shared.data(for: request),
              (response as? HTTPURLResponse)?.statusCode == 200,
              let decoded = try? JSONDecoder().decode(OSRMResponse.self, from: data),
              decoded.code == "Ok",
              let geometry = decoded.routes?.first?.geometry.coordinates else {
            return nil
        }
        let path = geometry.compactMap { pair -> CLLocationCoordinate2D? in
            guard pair.count >= 2 else { return nil }
            return CLLocationCoordinate2D(latitude: pair[1], longitude: pair[0])
        }
        return path.count > 1 ? path : nil
    }

    /// Routers start and end on the nearest road; carry the line on to the
    /// hub and the door so it meets both pins.
    private static func joined(_ path: [CLLocationCoordinate2D], from origin: CLLocationCoordinate2D, to destination: CLLocationCoordinate2D) -> [CLLocationCoordinate2D] {
        [origin] + path + [destination]
    }

    /// The map rect around a path, for framing the camera on it.
    static func boundingRect(of path: [CLLocationCoordinate2D]) -> MKMapRect {
        let points = path.map { MKMapPoint($0) }
        guard let first = points.first else { return .null }
        var minX = first.x, maxX = first.x, minY = first.y, maxY = first.y
        for point in points.dropFirst() {
            minX = min(minX, point.x)
            maxX = max(maxX, point.x)
            minY = min(minY, point.y)
            maxY = max(maxY, point.y)
        }
        return MKMapRect(x: minX, y: minY, width: maxX - minX, height: maxY - minY)
    }
}
