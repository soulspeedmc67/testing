import Foundation
import CoreLocation

/// Neighbourhoods the hub serves, ported from `ANANTNAG_LOCALITIES` in
/// `src/lib/maps.js`. They answer address search instantly and offline, and
/// stand in where Apple Maps knows few places around Anantnag.
struct AnantnagLocality: Identifiable, Hashable {
    let name: String
    let area: String
    let latitude: Double
    let longitude: Double
    let aliases: [String]

    var id: String { name }

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    static let all: [AnantnagLocality] = [
        .init(name: "Lal Chowk", area: "Lal Chowk", latitude: 33.735832, longitude: 75.143614, aliases: ["lal chowk", "clock tower", "center"]),
        .init(name: "Nai Basti (Near Petrol Pump)", area: "Nai Basti", latitude: 33.7311, longitude: 75.1487, aliases: ["nai basti", "naibasti", "petrol pump"]),
        .init(name: "KP Road (Khanabal-Pahalgam Road)", area: "KP Road", latitude: 33.7290, longitude: 75.1550, aliases: ["kp road", "khanabal pahalgam road", "kp"]),
        .init(name: "Khanabal Junction & Degree College", area: "Khanabal", latitude: 33.7440, longitude: 75.1320, aliases: ["khanabal", "khannabal", "degree college", "khanabal bridge"]),
        .init(name: "Janglat Mandi (Hospital Road)", area: "Janglat Mandi", latitude: 33.7265, longitude: 75.1585, aliases: ["janglat mandi", "janglat", "mandi", "hospital road"]),
        .init(name: "Ashajipora", area: "Ashajipora", latitude: 33.7230, longitude: 75.1610, aliases: ["ashajipora", "ashaji pora"]),
        .init(name: "Lazibal", area: "Lazibal", latitude: 33.7410, longitude: 75.1410, aliases: ["lazibal", "lazbal"]),
        .init(name: "Anchidora", area: "Anchidora", latitude: 33.7390, longitude: 75.1490, aliases: ["anchidora", "anchi dora"]),
        .init(name: "Tikbag Khanabal", area: "Tikbag", latitude: 33.7470, longitude: 75.1350, aliases: ["tikbag", "tik bag", "tikbagh"]),
        .init(name: "Mattan / Martand", area: "Mattan", latitude: 33.7660, longitude: 75.2080, aliases: ["mattan", "martand", "mattan temple"]),
        .init(name: "Dialgam", area: "Dialgam", latitude: 33.7120, longitude: 75.1750, aliases: ["dialgam", "dailgam"]),
        .init(name: "Sherbagh", area: "Sherbagh", latitude: 33.7320, longitude: 75.1510, aliases: ["sherbagh", "sher bagh"]),
        .init(name: "Reshi Bazar", area: "Reshi Bazar", latitude: 33.7340, longitude: 75.1490, aliases: ["reshi bazar", "rishi bazar"]),
        .init(name: "Brakpora", area: "Brakpora", latitude: 33.7180, longitude: 75.1680, aliases: ["brakpora", "brak pora"]),
        .init(name: "Achabal Adda", area: "Achabal Adda", latitude: 33.7285, longitude: 75.1520, aliases: ["achabal adda", "achabal bus stand"]),
        .init(name: "Chee Anantnag", area: "Chee", latitude: 33.7380, longitude: 75.1380, aliases: ["chee", "che"]),
        .init(name: "Harnag", area: "Harnag", latitude: 33.7490, longitude: 75.1280, aliases: ["harnag", "railway station"]),
        .init(name: "Mirbazar", area: "Mirbazar", latitude: 33.7050, longitude: 75.1200, aliases: ["mirbazar", "mir bazar"])
    ]

    /// Localities whose name, area or a common spelling contains the query.
    static func matching(_ query: String) -> [AnantnagLocality] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        guard !q.isEmpty else { return [] }
        return all.filter { locality in
            locality.name.lowercased().contains(q)
                || locality.area.lowercased().contains(q)
                || locality.aliases.contains { $0.contains(q) }
        }
    }
}
