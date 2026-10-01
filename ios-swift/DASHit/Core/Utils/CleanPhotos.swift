import Foundation

/// Which product photos are clean packshots: the product alone on plain white.
/// Items with one are listed first, then items with any other photo, then
/// items without a photo. The list is made by `scripts/clean-photo-index.py`
/// and served at dashit.co.in/catalog/clean-photos-v1.json as photo names
/// ("dsh_<hash>"); a copy is kept on the phone so the order is right offline.
/// Same as the Android app's `CleanPhotos.kt`.
enum CleanPhotos {
    private static let listURL = URL(string: "https://dashit.co.in/catalog/clean-photos-v1.json")!
    private static var savedFile: URL {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("clean-photos-v1.json")
    }

    private struct List: Decodable { let clean: [String] }

    /// The saved list straight away, then the fresh one once downloaded.
    static func load(_ update: @escaping @MainActor (Set<String>) -> Void) {
        Task.detached(priority: .utility) {
            if let data = try? Data(contentsOf: savedFile), let names = parse(data) {
                await update(names)
            }
            guard let (data, response) = try? await URLSession.shared.data(from: listURL),
                  (response as? HTTPURLResponse)?.statusCode == 200,
                  let names = parse(data), !names.isEmpty else { return }
            try? FileManager.default.createDirectory(
                at: savedFile.deletingLastPathComponent(), withIntermediateDirectories: true)
            try? data.write(to: savedFile, options: .atomic)
            await update(names)
        }
    }

    private static func parse(_ data: Data) -> Set<String>? {
        (try? JSONDecoder().decode(List.self, from: data)).map { Set($0.clean) }
    }

    /// 0 clean white photo, 1 other photo, 2 no photo.
    static func rank(_ img: String, in clean: Set<String>) -> Int {
        if img.isEmpty { return 2 }
        let file = img.split(separator: "/").last.map(String.init) ?? img
        let name = file.split(separator: "#").first.flatMap { $0.split(separator: ".").first }.map(String.init) ?? file
        return clean.contains(name) ? 0 : 1
    }
}
