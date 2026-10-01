import CoreLocation

/// Where a rider is on the road to the door, measured on the road itself:
/// the closest point on it, the part still to ride, and its length. Used to
/// draw only the road ahead and to work out the distance and time left.
enum RouteGeometry {
    struct OnPath {
        let index: Int
        let point: CLLocationCoordinate2D
        let meters: Double
    }

    /// Equirectangular metres from `origin`, good to a few centimetres over a town.
    private static func meters(from origin: CLLocationCoordinate2D, to p: CLLocationCoordinate2D) -> (x: Double, y: Double) {
        let x = (p.longitude - origin.longitude) * cos(origin.latitude * .pi / 180) * 111_320
        let y = (p.latitude - origin.latitude) * 110_540
        return (x, y)
    }

    /// The closest point of the road to `p`: which segment, where on it, how far off.
    static func nearest(_ path: [CLLocationCoordinate2D], to p: CLLocationCoordinate2D) -> OnPath? {
        guard path.count >= 2 else { return nil }
        var best: OnPath?
        for i in 0..<(path.count - 1) {
            let a = meters(from: p, to: path[i])
            let b = meters(from: p, to: path[i + 1])
            let dx = b.x - a.x
            let dy = b.y - a.y
            let len2 = dx * dx + dy * dy
            let t = len2 == 0 ? 0 : min(max((-a.x * dx - a.y * dy) / len2, 0), 1)
            let cx = a.x + t * dx
            let cy = a.y + t * dy
            let d = (cx * cx + cy * cy).squareRoot()
            if best == nil || d < best!.meters {
                let point = CLLocationCoordinate2D(
                    latitude: path[i].latitude + (path[i + 1].latitude - path[i].latitude) * t,
                    longitude: path[i].longitude + (path[i + 1].longitude - path[i].longitude) * t
                )
                best = OnPath(index: i, point: point, meters: d)
            }
        }
        return best
    }

    /// The road from the rider's place on it to the end; what is behind is gone.
    static func trim(_ path: [CLLocationCoordinate2D], to rider: CLLocationCoordinate2D) -> [CLLocationCoordinate2D] {
        guard let on = nearest(path, to: rider) else { return path }
        return [on.point] + Array(path[(on.index + 1)...])
    }

    static func length(_ path: [CLLocationCoordinate2D]) -> Double {
        guard path.count >= 2 else { return 0 }
        var sum = 0.0
        for i in 0..<(path.count - 1) {
            sum += CLLocation(latitude: path[i].latitude, longitude: path[i].longitude)
                .distance(from: CLLocation(latitude: path[i + 1].latitude, longitude: path[i + 1].longitude))
        }
        return sum
    }
}
