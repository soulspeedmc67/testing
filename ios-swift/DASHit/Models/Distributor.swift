import Foundation

/// Someone the owner buys stock from. "Myself" is built in and covers everything
/// the owner stocks without a distributor.
public struct Distributor: Codable, Identifiable, Hashable {
    public let id: String
    public let name: String
    public let contact: String
    public let phone: String
    public let email: String
    public let address: String
    public let category: String
    public let leadTime: String
    public let notes: String
    public let active: Bool

    public init(
        id: String = UUID().uuidString,
        name: String,
        contact: String = "",
        phone: String = "",
        email: String = "",
        address: String = "",
        category: String = "",
        leadTime: String = "",
        notes: String = "",
        active: Bool = true
    ) {
        self.id = id
        self.name = name
        self.contact = contact
        self.phone = phone
        self.email = email
        self.address = address
        self.category = category
        self.leadTime = leadTime
        self.notes = notes
        self.active = active
    }

    /// Distributors saved from the web console only carry some of these fields.
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.init(
            id: try c.decode(String.self, forKey: .id),
            name: try c.decode(String.self, forKey: .name),
            contact: (try? c.decodeIfPresent(String.self, forKey: .contact)) ?? "",
            phone: (try? c.decodeIfPresent(String.self, forKey: .phone)) ?? "",
            email: (try? c.decodeIfPresent(String.self, forKey: .email)) ?? "",
            address: (try? c.decodeIfPresent(String.self, forKey: .address)) ?? "",
            category: (try? c.decodeIfPresent(String.self, forKey: .category)) ?? "",
            leadTime: (try? c.decodeIfPresent(String.self, forKey: .leadTime)) ?? "",
            notes: (try? c.decodeIfPresent(String.self, forKey: .notes)) ?? "",
            active: (try? c.decodeIfPresent(Bool.self, forKey: .active)) ?? true
        )
    }

    // MARK: - Myself

    public static let selfName = "Myself"
    public static let myself = Distributor(id: "SELF", name: selfName)
    public var isSelf: Bool { id == Distributor.myself.id }

    /// Six made-up distributors used to be filled in as examples, on the web
    /// and here. They are dropped wherever they turn up.
    private static let demoIds: Set<String> = [
        "dist_1", "dist_2", "dist_3", "dist_4", "dist_5", "dist_6",
        "DIST-KASHMIR-FMCG", "DIST-AMUL-VALLEY", "DIST-KANDUR-BAKERY",
        "DIST-ANANTNAG-ORCHARDS", "DIST-HUL-DIRECT", "DIST-ITC-NESTLE"
    ]
    private static let demoNames: Set<String> = [
        "Kashmir Wholesale FMCG", "Amul Valley Dairy Logistics", "Local Kandur Bakeries",
        "Anantnag Fresh Farm Orchards", "Hindustan Unilever Direct", "ITC & Nestlé Supply Hub"
    ]

    public var isReal: Bool {
        !isSelf && active && !Distributor.demoIds.contains(id) && !Distributor.demoNames.contains(name)
    }

    /// Who an item's stock came from; untagged items are the owner's own.
    public static func resolvedName(_ raw: String?) -> String {
        let name = (raw ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if name.isEmpty || demoNames.contains(name) { return selfName }
        return name
    }
}
