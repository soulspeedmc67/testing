import Foundation
import UIKit
import FirebaseFirestore

/// The shop's product list, from one file on the website instead of ~4,600
/// Firestore reads (public/api/catalog/). A copy is kept on the phone: shown
/// at once on the next open, refreshed from the file when it has changed (the
/// website answers "not modified" otherwise), and kept current by asking the
/// website what changed since its version, every 30 seconds while the app is
/// on screen. Same as Android's `CatalogueFile`.
///
/// Entries keep Firestore's field names, so they decode into `Product` as
/// before; a switched-off product arrives as { id, active: false } and is dropped.
final class CatalogueFile: NSObject, ListenerRegistration {
    private static let server = URL(string: "https://dashit.co.in/")!
    private static let savedURL = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("catalog.json")
    private static let etagKey = "dashit_catalog_etag"
    private static let modifiedKey = "dashit_catalog_modified"

    private let queue = DispatchQueue(label: "dashit.catalogue.file", qos: .userInitiated)
    private var entries: [String: [String: Any]] = [:]   // touched on `queue` only
    private var version: Int64 = 0
    private var isRemoved = false
    private var pollTask: Task<Void, Never>?
    private let completion: ([Product]) -> Void

    init(completion: @escaping ([Product]) -> Void) {
        self.completion = completion
        super.init()
        start()
    }

    func remove() {
        isRemoved = true
        pollTask?.cancel()
    }

    private func start() {
        pollTask = Task.detached(priority: .userInitiated) { [weak self] in
            guard let self else { return }
            // 1. The copy on the phone: at once, no network.
            if await self.run({ self.loadSaved() }) { await self.deliver() }
            // 2. The file, if it changed.
            var retry = 0
            var delivered = await self.run { !self.entries.isEmpty }
            while !Task.isCancelled {
                if await self.download() || !delivered {
                    if await self.run({ !self.entries.isEmpty }) {
                        await self.deliver()
                        delivered = true
                    }
                }
                if delivered { break }
                // Nothing on the phone and no file yet: the built-in list stands in
                // after a few seconds, and the file is asked for again.
                if retry == 1 {
                    let seed = CatalogSeed.products
                    await MainActor.run { if !self.isRemoved { self.completion(seed) } }
                }
                try? await Task.sleep(for: .seconds(min(30, 5 * (1 << retry))))
                retry += 1
            }
            // 3. What changed since, while the app is on screen.
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(30))
                let active = await MainActor.run { UIApplication.shared.applicationState == .active }
                if active, await self.fetchChanges() { await self.deliver() }
            }
        }
    }

    // MARK: - Steps

    private func run<T>(_ work: @escaping () -> T) async -> T {
        await withCheckedContinuation { continuation in
            queue.async { continuation.resume(returning: work()) }
        }
    }

    private func loadSaved() -> Bool {
        guard let data = try? Data(contentsOf: Self.savedURL), let file = Self.parse(data) else { return false }
        replaceAll(file)
        return true
    }

    /// True when the copy here was replaced by a newer file.
    private func download() async -> Bool {
        var request = URLRequest(url: Self.server.appendingPathComponent("catalog/catalog.json"))
        request.timeoutInterval = 30
        request.cachePolicy = .reloadIgnoringLocalCacheData
        let hasCopy = await run { !self.entries.isEmpty }
        if hasCopy {
            // Both, so "not modified" works even when the website compresses
            // the file (Apache then changes the ETag, but not the date).
            if let etag = UserDefaults.standard.string(forKey: Self.etagKey) { request.setValue(etag, forHTTPHeaderField: "If-None-Match") }
            if let date = UserDefaults.standard.string(forKey: Self.modifiedKey) { request.setValue(date, forHTTPHeaderField: "If-Modified-Since") }
        }
        guard let (data, response) = try? await URLSession.shared.data(for: request),
              let http = response as? HTTPURLResponse, http.statusCode == 200,
              let file = Self.parse(data) else { return false }
        let shownCount = file.products.filter { ($0["active"] as? Bool) != false }.count
        let accepted: Bool = await run {
            let before = self.entries.values.filter { ($0["active"] as? Bool) != false }.count
            // A broken or truncated file never replaces a good copy.
            guard file.version > 0, shownCount >= 50, before == 0 || Double(shownCount) >= Double(before) * 0.9 else { return false }
            self.replaceAll(file)
            try? FileManager.default.createDirectory(at: Self.savedURL.deletingLastPathComponent(), withIntermediateDirectories: true)
            try? data.write(to: Self.savedURL, options: .atomic)
            return true
        }
        if accepted {
            UserDefaults.standard.set(http.value(forHTTPHeaderField: "ETag"), forKey: Self.etagKey)
            UserDefaults.standard.set(http.value(forHTTPHeaderField: "Last-Modified"), forKey: Self.modifiedKey)
        }
        return accepted
    }

    /// True when something changed since this phone's version.
    private func fetchChanges() async -> Bool {
        let since = await run { self.version }
        guard since > 0 else { return false }
        var components = URLComponents(url: Self.server.appendingPathComponent("api/catalog/changes.php"), resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "since", value: String(since))]
        guard let url = components.url,
              let (data, response) = try? await URLSession.shared.data(from: url),
              (response as? HTTPURLResponse)?.statusCode == 200,
              let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else { return false }
        let changed = json["products"] as? [[String: Any]] ?? []
        let newVersion = (json["version"] as? NSNumber)?.int64Value ?? since
        return await run {
            for entry in changed {
                if let id = entry["id"] as? String { self.entries[id] = entry }
            }
            self.version = max(self.version, newVersion)
            if !changed.isEmpty { self.save() }
            return !changed.isEmpty
        }
    }

    private func deliver() async {
        let products: [Product] = await run {
            let decoder = Firestore.Decoder()
            return self.entries.keys.sorted().compactMap { id in
                guard let entry = self.entries[id], (entry["active"] as? Bool) != false else { return nil }
                return try? decoder.decode(Product.self, from: entry)
            }
        }
        guard !products.isEmpty else { return }
        await MainActor.run { if !self.isRemoved { self.completion(products) } }
    }

    // MARK: - File

    private struct File {
        let version: Int64
        let products: [[String: Any]]
    }

    private static func parse(_ data: Data) -> File? {
        guard let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              let products = json["products"] as? [[String: Any]] else { return nil }
        return File(version: (json["version"] as? NSNumber)?.int64Value ?? 0, products: products)
    }

    private func replaceAll(_ file: File) {
        entries = [:]
        for entry in file.products {
            if let id = entry["id"] as? String { entries[id] = entry }
        }
        version = file.version
    }

    private func save() {
        let file: [String: Any] = ["version": version, "products": Array(entries.values)]
        guard let data = try? JSONSerialization.data(withJSONObject: file) else { return }
        try? data.write(to: Self.savedURL, options: .atomic)
    }
}
