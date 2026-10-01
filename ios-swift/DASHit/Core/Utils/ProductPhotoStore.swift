import SwiftUI
import UIKit
import ImageIO
import CryptoKit

/// Product photos kept on the phone. Photos stay web links (the shop hosts
/// none), but every photo is saved to the app's cache folder the first time
/// it downloads, so after that it shows instantly and without a connection.
/// Photos for the home feed are also fetched ahead on Wi-Fi.
///
/// Memory first, then the saved copy, then the network. Photos are shrunk to
/// at most 800px on load, which keeps thousands of them light in memory.
final class ProductPhotoStore: @unchecked Sendable {
    static let shared = ProductPhotoStore()

    private let memory = NSCache<NSURL, UIImage>()
    private let folder: URL
    private let lock = NSLock()
    private var inFlight: [URL: Task<UIImage?, Never>] = [:]
    private var prefetched = Set<URL>()

    /// Ahead-of-time downloads never use mobile data or Low Data Mode.
    private let prefetchSession: URLSession = {
        let config = URLSessionConfiguration.default
        config.allowsExpensiveNetworkAccess = false
        config.allowsConstrainedNetworkAccess = false
        config.httpMaximumConnectionsPerHost = 4
        return URLSession(configuration: config)
    }()

    /// On-screen photos: many at a time, so a grid of products fills at once
    /// rather than a few photos at a time.
    private let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.httpMaximumConnectionsPerHost = 16
        config.timeoutIntervalForRequest = 15
        config.urlCache = nil // saved to our own folder instead
        return URLSession(configuration: config)
    }()

    private static let maxPixelSize: CGFloat = 800
    private static let diskLimitBytes = 300 * 1024 * 1024

    private init() {
        let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        folder = caches.appendingPathComponent("ProductPhotos", isDirectory: true)
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        memory.totalCostLimit = 80 * 1024 * 1024
        let folder = self.folder
        DispatchQueue.global(qos: .utility).async { Self.trim(folder) }
    }

    /// Resolves product photo URLs:
    /// 1. Relative catalog paths (e.g. /products/catalog/...) map directly to Hostinger production CDN.
    /// 2. Open Food Facts original links map to the fast, lightweight 400px derivative.
    static func displayURL(_ url: URL) -> URL {
        var text = url.absoluteString
        // The product page asks for the full photo; cards get the small copy.
        if text.hasSuffix(fullSizeMark) {
            text.removeLast(fullSizeMark.count)
            return absolute(text)
        }
        let resolved = absolute(text).absoluteString
        if resolved.contains(catalogPath) {
            return URL(string: resolved.replacingOccurrences(of: catalogPath, with: thumbPath)) ?? url
        }
        if url.scheme == nil || (!text.hasPrefix("http://") && !text.hasPrefix("https://")) {
            let path = text.hasPrefix("/") ? text : "/\(text)"
            if let hostingerURL = URL(string: "https://dashit.co.in\(path)") {
                return hostingerURL
            }
        }
        guard text.contains("openfoodfacts.") || text.contains("openbeautyfacts."),
              let range = text.range(of: #"\.full\.(jpg|jpeg|png|webp)$"#, options: [.regularExpression, .caseInsensitive])
        else { return url }
        let smaller = text.replacingCharacters(in: range, with: ".400" + String(text[range].dropFirst(5)))
        return URL(string: smaller) ?? url
    }

    private static let catalogPath = "dashit.co.in/products/catalog/"
    private static let thumbPath = "dashit.co.in/products/thumbs/"
    private static let fullSizeMark = "#full"

    /// A photo at full size (the product page); elsewhere catalogue photos
    /// load as their 400px copy (~10 KB instead of ~100 KB).
    static func fullSize(_ url: String) -> String {
        url.isEmpty ? url : url + fullSizeMark
    }

    private static func absolute(_ text: String) -> URL {
        if text.hasPrefix("http://") || text.hasPrefix("https://") { return URL(string: text) ?? URL(fileURLWithPath: "/") }
        let path = text.hasPrefix("/") ? text : "/\(text)"
        return URL(string: "https://dashit.co.in\(path)") ?? URL(fileURLWithPath: "/")
    }

    /// Already decoded this session: no waiting at all.
    func memoryImage(_ url: URL) -> UIImage? {
        memory.object(forKey: url as NSURL)
    }

    func image(for url: URL) async -> UIImage? {
        if let hit = memoryImage(url) { return hit }
        let task: Task<UIImage?, Never> = lock.withLock {
            if let running = inFlight[url] { return running }
            let started = Task.detached(priority: .userInitiated) { [self] in await self.load(url) }
            inFlight[url] = started
            return started
        }
        let image = await task.value
        lock.withLock { inFlight[url] = nil }
        return image
    }

    /// Saves photos ahead of time (Wi-Fi only), without decoding them now.
    func prefetch(_ urls: [URL]) {
        let urls = urls.map(Self.displayURL)
        let fresh: [URL] = lock.withLock {
            let new = urls.filter { !prefetched.contains($0) }
            prefetched.formUnion(new)
            return new
        }
        guard !fresh.isEmpty else { return }
        Task.detached(priority: .background) { [self] in
            for url in fresh where memoryImage(url) == nil {
                let file = fileURL(for: url)
                if FileManager.default.fileExists(atPath: file.path) { continue }
                guard let (data, response) = try? await prefetchSession.data(from: url),
                      Self.isOK(response), response.mimeType?.hasPrefix("image") ?? true else { continue }
                try? data.write(to: file, options: .atomic)
            }
        }
    }

    // MARK: - Loading

    private func load(_ url: URL, attempt: Int = 0) async -> UIImage? {
        let file = fileURL(for: url)
        if let data = try? Data(contentsOf: file), let image = Self.decode(data) {
            remember(image, for: url)
            return image
        }
        guard let (data, response) = try? await session.data(from: url),
              Self.isOK(response), let image = Self.decode(data) else {
            let text = url.absoluteString
            // No small copy yet (a photo picked after the thumbnails were made): the full one.
            if attempt == 0, text.contains(Self.thumbPath),
               let full = URL(string: text.replacingOccurrences(of: Self.thumbPath, with: Self.catalogPath)) {
                return await load(full, attempt: 1)
            }
            // The host sometimes answers a full-size photo with "not found" and then
            // serves it a moment later: ask again, then settle for the small copy.
            if text.contains(Self.catalogPath) {
                if attempt < 3 {
                    try? await Task.sleep(for: .milliseconds(350))
                    return await load(url, attempt: attempt + 1)
                }
                if attempt == 3, let small = URL(string: text.replacingOccurrences(of: Self.catalogPath, with: Self.thumbPath)) {
                    return await load(small, attempt: 4)
                }
            }
            return nil
        }
        try? data.write(to: file, options: .atomic)
        remember(image, for: url)
        return image
    }

    private func remember(_ image: UIImage, for url: URL) {
        let cost = Int(image.size.width * image.size.height * image.scale * image.scale * 4)
        memory.setObject(image, forKey: url as NSURL, cost: cost)
    }

    private func fileURL(for url: URL) -> URL {
        let digest = SHA256.hash(data: Data(url.absoluteString.utf8))
        let name = digest.map { String(format: "%02x", $0) }.joined()
        return folder.appendingPathComponent(name)
    }

    private static func isOK(_ response: URLResponse) -> Bool {
        guard let http = response as? HTTPURLResponse else { return true }
        return (200..<400).contains(http.statusCode)
    }

    /// Decodes and shrinks in one step (ImageIO), so a 4000px photo never
    /// sits in memory at full size.
    private static func decode(_ data: Data) -> UIImage? {
        guard let source = CGImageSourceCreateWithData(data as CFData, nil) else { return nil }
        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceShouldCacheImmediately: true,
            kCGImageSourceThumbnailMaxPixelSize: maxPixelSize
        ]
        guard let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else { return nil }
        return UIImage(cgImage: cgImage)
    }

    /// Keeps the saved photos under the size limit, oldest first out.
    private static func trim(_ folder: URL) {
        let keys: [URLResourceKey] = [.contentAccessDateKey, .totalFileAllocatedSizeKey]
        guard let files = try? FileManager.default.contentsOfDirectory(
            at: folder, includingPropertiesForKeys: keys, options: .skipsHiddenFiles
        ) else { return }
        var entries = files.compactMap { url -> (url: URL, date: Date, size: Int)? in
            guard let values = try? url.resourceValues(forKeys: Set(keys)) else { return nil }
            return (url, values.contentAccessDate ?? .distantPast, values.totalFileAllocatedSize ?? 0)
        }
        var total = entries.reduce(0) { $0 + $1.size }
        guard total > diskLimitBytes else { return }
        entries.sort { $0.date < $1.date }
        for entry in entries where total > diskLimitBytes * 8 / 10 {
            try? FileManager.default.removeItem(at: entry.url)
            total -= entry.size
        }
    }
}

/// Stands in for `AsyncImage` wherever product photos show, with the same
/// phases, but reading through `ProductPhotoStore` so photos come from the
/// phone after the first time.
struct CachedAsyncImage<Content: View>: View {
    private let url: URL?
    private let transaction: Transaction
    private let content: (AsyncImagePhase) -> Content
    @State private var phase: AsyncImagePhase

    init(url: URL?, transaction: Transaction = Transaction(), @ViewBuilder content: @escaping (AsyncImagePhase) -> Content) {
        let url = url.map(ProductPhotoStore.displayURL)
        self.url = url
        self.transaction = transaction
        self.content = content
        // Already in memory: shown in the very first frame, no flash.
        if let url, let image = ProductPhotoStore.shared.memoryImage(url) {
            _phase = State(initialValue: .success(Image(uiImage: image)))
        } else {
            _phase = State(initialValue: .empty)
        }
    }

    var body: some View {
        content(phase)
            .task(id: url) { await load() }
    }

    private func load() async {
        guard let url else {
            phase = .failure(URLError(.badURL))
            return
        }
        if let image = ProductPhotoStore.shared.memoryImage(url) {
            phase = .success(Image(uiImage: image))
            return
        }
        phase = .empty
        let image = await ProductPhotoStore.shared.image(for: url)
        guard !Task.isCancelled else { return }
        withTransaction(transaction) {
            phase = image.map { .success(Image(uiImage: $0)) } ?? .failure(URLError(.cannotDecodeContentData))
        }
    }
}
