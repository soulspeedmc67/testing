import Foundation

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
        address: String = "Anantnag, Kashmir",
        category: String = "Wholesale FMCG",
        leadTime: String = "1-2 days",
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

    public static let defaults: [Distributor] = [
        Distributor(id: "dist_1", name: "Kashmir Wholesale FMCG", contact: "Tariq Ahmad", phone: "+91 94190 12345", category: "Wholesale Staples", leadTime: "1 day"),
        Distributor(id: "dist_2", name: "Amul Valley Dairy Logistics", contact: "Fayaz Reshi", phone: "+91 97970 54321", category: "Fresh Dairy", leadTime: "Daily Morning"),
        Distributor(id: "dist_3", name: "Local Kandur Bakeries", contact: "Ghulam Nabi", phone: "+91 99060 11223", category: "Artisan Bakery", leadTime: "Same Day (4 AM)"),
        Distributor(id: "dist_4", name: "Anantnag Fresh Farm Orchards", contact: "Bashir Mir", phone: "+91 94191 99887", category: "Valley Produce", leadTime: "Daily Fresh"),
        Distributor(id: "dist_5", name: "Hindustan Unilever Direct", contact: "Amit Sharma", phone: "+91 98110 33445", category: "Personal & Home Care", leadTime: "2-3 days"),
        Distributor(id: "dist_6", name: "ITC & Nestlé Supply Hub", contact: "Showkat Wani", phone: "+91 96220 77665", category: "Packaged Foods", leadTime: "1-2 days")
    ]
}
