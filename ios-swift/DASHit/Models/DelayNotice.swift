import Foundation

/// The notice the admin can switch on to tell customers their order may take
/// longer (many orders at once, rain, snow, short of riders, or their own
/// words). It is `weatherAlert` on `config/store`: the web console already
/// writes and shows it, and the shop apps follow the same field.
struct DelayNotice: Equatable {
    /// "surge", "rain" or "snow" (the web console's types).
    var type: String
    var title: String
    var message: String

    static let surgeTitle = "Orders may be delayed"

    /// The reasons the admin picks from, with the words customers read.
    /// The last choice in the admin list ("Write my own") takes the admin's own words.
    static let presets: [(label: String, type: String, title: String, message: String)] = [
        ("High order volume", "surge", surgeTitle,
         "We're getting a lot of orders right now, so yours may take a little longer. Thank you for waiting."),
        ("Rain", "rain", "Rain advisory",
         "Riders are going carefully in the rain. Deliveries may take 10–15 minutes longer."),
        ("Snow", "snow", "Snow advisory",
         "Riders are going carefully in the snow. Deliveries may take 10–15 minutes longer."),
        ("Not enough riders", "surge", surgeTitle,
         "Our riders are all out on deliveries, so your order may take a little longer to reach you.")
    ]

    /// The notice on `config/store`, when it is switched on; nil otherwise.
    init?(storeData data: [String: Any]) {
        guard let alert = data["weatherAlert"] as? [String: Any], (alert["active"] as? Bool) == true else { return nil }
        let type = (alert["type"] as? String) ?? "surge"
        let title = (alert["title"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let message = (alert["message"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        self.type = type
        self.title = title.isEmpty ? Self.defaultTitle(for: type) : title
        self.message = message.isEmpty ? Self.defaultMessage(for: type) : message
    }

    init(type: String, title: String, message: String) {
        self.type = type
        self.title = title
        self.message = message
    }

    private static func defaultTitle(for type: String) -> String {
        switch type {
        case "rain": return "Rain advisory"
        case "snow": return "Snow advisory"
        default: return surgeTitle
        }
    }

    private static func defaultMessage(for type: String) -> String {
        switch type {
        case "rain", "snow": return "Riders are going carefully. Deliveries may take 10–15 minutes longer."
        default: return presets[0].message
        }
    }

    var symbol: String {
        switch type {
        case "rain": return "cloud.rain.fill"
        case "snow": return "snowflake"
        default: return "clock.badge.exclamationmark.fill"
        }
    }

    /// What the admin app writes to `config/store` as `weatherAlert`.
    func fields(active: Bool) -> [String: Any] {
        ["active": active, "type": type, "title": title, "message": message]
    }
}
