import Foundation

/// Lenient reads for documents written by the web app, which stores some ids
/// as numbers, some prices as strings, and timestamps in several shapes.
extension KeyedDecodingContainer {
    func flexibleString(_ key: Key) -> String? {
        if let value = try? decode(String.self, forKey: key) { return value }
        if let value = try? decode(Int.self, forKey: key) { return String(value) }
        if let value = try? decode(Double.self, forKey: key) {
            return value.rounded() == value ? String(Int(value)) : String(value)
        }
        return nil
    }

    func flexibleDouble(_ key: Key) -> Double? {
        if let value = try? decode(Double.self, forKey: key) { return value }
        if let value = try? decode(Int.self, forKey: key) { return Double(value) }
        if let value = try? decode(String.self, forKey: key) { return Double(value) }
        return nil
    }

    func flexibleInt(_ key: Key) -> Int? {
        flexibleDouble(key).map { Int($0) }
    }

    /// Seconds since 1970 from a Firestore Timestamp, a number (seconds or
    /// milliseconds) or an ISO-8601 string.
    func flexibleTimestamp(_ key: Key) -> Double? {
        // Numbers first: Date's own Decodable reads a bare number as seconds
        // since 2001, which would shift an epoch value by 31 years.
        if let number = flexibleDouble(key) {
            return number > 10_000_000_000 ? number / 1000 : number
        }
        if let date = try? decode(Date.self, forKey: key) {
            return date.timeIntervalSince1970
        }
        if let text = try? decode(String.self, forKey: key) {
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = formatter.date(from: text) { return date.timeIntervalSince1970 }
            formatter.formatOptions = [.withInternetDateTime]
            if let date = formatter.date(from: text) { return date.timeIntervalSince1970 }
        }
        return nil
    }
}
