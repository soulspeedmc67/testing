import Foundation

public struct Category: Codable, Identifiable, Hashable {
    public let id: String
    public let name: String
    public let icon: String?
    public let image: String?
    public let sortOrder: Int?
    public let itemCount: Int?
    
    public init(id: String, name: String, icon: String? = nil, image: String? = nil, sortOrder: Int? = 0, itemCount: Int? = nil) {
        self.id = id
        self.name = name
        self.icon = icon
        self.image = image
        self.sortOrder = sortOrder
        self.itemCount = itemCount
    }
}
