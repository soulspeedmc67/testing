import SwiftUI
import PhotosUI

/// What the sale editor collects; `AdminDashboardViewModel.saveSale` turns it
/// into the `offers` document (same fields as the staff console's sale editor,
/// see `src/lib/sales.js`).
struct SaleDraft {
    var id: String?
    var title = ""
    var subtitle = ""
    var badge = "SALE"
    var priceTag = ""
    var onOneCategory = false
    var category = ""
    var promoCode = ""
    var img = ""
    var startsAt: Date?
    var endsAt: Date?
    var active = true

    init() {}

    init(_ offer: Offer) {
        id = offer.id
        title = offer.title
        subtitle = offer.subtitle
        badge = offer.badge.isEmpty ? "SALE" : offer.badge
        priceTag = offer.priceTag
        onOneCategory = offer.opensCategory
        category = offer.opensCategory ? offer.category : ""
        promoCode = offer.promoCode
        img = offer.img
        startsAt = offer.startsAt.map { Date(timeIntervalSince1970: $0) }
        endsAt = offer.endsAt.map { Date(timeIntervalSince1970: $0) }
        active = offer.active ?? true
    }

    /// Problems in plain words; empty means it can be saved.
    var problems: [String] {
        var list: [String] = []
        if title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { list.append("Give the sale a name.") }
        if onOneCategory && category.isEmpty { list.append("Choose which category the sale is on.") }
        if let startsAt, let endsAt, endsAt <= startsAt { list.append("The end has to be after the start.") }
        if let endsAt, endsAt <= Date() { list.append("The end is already in the past.") }
        return list
    }

    /// The short "ends" line shown on the banner itself.
    var expiresText: String {
        guard let endsAt else { return "Active today" }
        if endsAt.timeIntervalSinceNow < 86_400 { return "Ends today" }
        return "Ends " + endsAt.formatted(.dateTime.day().month(.abbreviated))
    }
}

/// Make or change a sale: the banner at the top of the shop. Photo, what it is,
/// what it applies to, an optional discount code and when it runs, with a
/// preview of the banner as customers see it.
struct AdminSaleEditorView: View {
    @ObservedObject var vm: AdminDashboardViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var draft: SaleDraft
    @State private var pickerItem: PhotosPickerItem?
    @State private var isUploading = false
    @State private var uploadError: String?
    @State private var triedSave = false
    @State private var startsLater: Bool
    @State private var hasEnd: Bool

    private let isEdit: Bool
    private static let badges = ["SALE", "NEW", "FESTIVE", "LIMITED", "DASHIT EXCLUSIVE"]

    init(vm: AdminDashboardViewModel, editing: Offer? = nil) {
        self.vm = vm
        let start = editing.map(SaleDraft.init) ?? SaleDraft()
        _draft = State(initialValue: start)
        _startsLater = State(initialValue: start.startsAt != nil)
        _hasEnd = State(initialValue: start.endsAt != nil)
        isEdit = editing != nil
    }

    private var categories: [String] {
        Array(Set(vm.products.map { $0.cat.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty })).sorted()
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    preview
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color.clear)
                } header: {
                    Text("How customers see it")
                }

                Section {
                    PhotosPicker(selection: $pickerItem, matching: .images) {
                        Label(draft.img.isEmpty ? "Add a photo" : "Change photo", systemImage: "photo.badge.plus")
                    }
                    .disabled(isUploading)
                    if isUploading {
                        HStack(spacing: 8) {
                            ProgressView()
                            Text("Uploading…").foregroundColor(.secondary)
                        }
                    }
                    if !draft.img.isEmpty {
                        Button(role: .destructive) {
                            draft.img = ""
                        } label: {
                            Label("Remove photo", systemImage: "trash")
                        }
                    }
                    if let uploadError {
                        Text(uploadError).font(.system(size: 12)).foregroundColor(.red)
                    }
                } header: {
                    Text("1. Photo")
                } footer: {
                    Text("A wide photo looks best. Big photos are made smaller for you.")
                }

                Section {
                    TextField("Name of the sale, like Eid Dairy Week", text: $draft.title)
                    TextField("A line about it", text: $draft.subtitle, axis: .vertical)
                        .lineLimit(1...3)
                    TextField("What customers get, like Up to 20% off", text: $draft.priceTag)
                    Picker("Small label", selection: $draft.badge) {
                        ForEach(Self.badges + (Self.badges.contains(draft.badge) ? [] : [draft.badge]), id: \.self) { badge in
                            Text(badge).tag(badge)
                        }
                    }
                } header: {
                    Text("2. What is the sale?")
                }

                Section {
                    Picker("Applies to", selection: $draft.onOneCategory) {
                        Text("Everything in the shop").tag(false)
                        Text("One category").tag(true)
                    }
                    .pickerStyle(.segmented)
                    if draft.onOneCategory {
                        Picker("Category", selection: $draft.category) {
                            Text("Choose…").tag("")
                            ForEach(categories, id: \.self) { Text($0).tag($0) }
                        }
                    }
                } header: {
                    Text("3. What does it apply to?")
                } footer: {
                    Text(draft.onOneCategory
                        ? "The banner opens that category, so customers see just those items."
                        : "The banner opens the shop with the best deals first.")
                }

                Section {
                    Picker("Code", selection: $draft.promoCode) {
                        Text("No code").tag("")
                        ForEach(vm.coupons, id: \.code) { coupon in
                            Text("\(coupon.code) · \(coupon.title)").tag(coupon.code)
                        }
                        if !draft.promoCode.isEmpty && !vm.coupons.contains(where: { $0.code == draft.promoCode }) {
                            Text(draft.promoCode).tag(draft.promoCode)
                        }
                    }
                } header: {
                    Text("4. Discount code (optional)")
                } footer: {
                    Text("Customers see the code on the banner and use it at checkout. It works as set under Discounts. Make or change codes there.")
                }

                Section {
                    Toggle("Start later", isOn: $startsLater)
                    if startsLater {
                        DatePicker("Starts", selection: Binding(get: { draft.startsAt ?? Date() }, set: { draft.startsAt = $0 }))
                    }
                    Toggle("Ends on a date", isOn: $hasEnd)
                    if hasEnd {
                        DatePicker("Ends", selection: Binding(get: { draft.endsAt ?? Date().addingTimeInterval(86_400 * 3) }, set: { draft.endsAt = $0 }))
                        HStack(spacing: 8) {
                            ForEach([("1 day", 1.0), ("3 days", 3.0), ("1 week", 7.0)], id: \.0) { text, days in
                                Button(text) {
                                    draft.endsAt = (draft.startsAt ?? Date()).addingTimeInterval(86_400 * days)
                                }
                                .buttonStyle(.bordered)
                                .font(.system(size: 12, weight: .semibold))
                            }
                        }
                    }
                } header: {
                    Text("5. When does it run?")
                } footer: {
                    Text("The banner appears when the sale starts and goes away by itself when it ends.")
                }

                Section {
                    Toggle("Show it to customers", isOn: $draft.active)
                } footer: {
                    Text("Switch off to keep the sale saved but hidden.")
                }

                if triedSave, let first = draft.problems.first {
                    Section {
                        Text(first).foregroundColor(.red).font(.system(size: 13, weight: .semibold))
                    }
                }
            }
            .navigationTitle(isEdit ? "Change this sale" : "New sale")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isEdit ? "Save" : "Publish") {
                        triedSave = true
                        guard draft.problems.isEmpty, !isUploading else { return }
                        vm.saveSale(draft)
                        dismiss()
                    }
                    .font(.system(size: 17, weight: .bold))
                    .disabled(isUploading)
                }
            }
            .onChange(of: startsLater) { _, on in
                if !on { draft.startsAt = nil } else if draft.startsAt == nil { draft.startsAt = Date() }
            }
            .onChange(of: hasEnd) { _, on in
                if !on { draft.endsAt = nil } else if draft.endsAt == nil { draft.endsAt = Date().addingTimeInterval(86_400 * 3) }
            }
            .onChange(of: pickerItem) { _, item in
                guard let item else { return }
                Task { await upload(item) }
            }
        }
    }

    private func upload(_ item: PhotosPickerItem) async {
        uploadError = nil
        isUploading = true
        defer {
            isUploading = false
            pickerItem = nil
        }
        guard let data = try? await item.loadTransferable(type: Data.self), let image = UIImage(data: data) else {
            uploadError = "That photo couldn't be read. Try another one."
            return
        }
        do {
            draft.img = try await vm.uploadProductPhoto(image)
        } catch {
            uploadError = (error as? LocalizedError)?.errorDescription ?? "The photo couldn't be added. Try again."
        }
    }

    // MARK: - Preview

    private var preview: some View {
        ZStack(alignment: .bottomLeading) {
            Color(red: 0.02, green: 0.09, blue: 0.22)
            if let url = URL(string: draft.img), !draft.img.isEmpty {
                AsyncImage(url: url) { phase in
                    if let image = phase.image {
                        image.resizable().scaledToFill().opacity(0.5)
                    } else {
                        Color.clear
                    }
                }
            }
            LinearGradient(colors: [.clear, .black.opacity(0.7)], startPoint: .top, endPoint: .bottom)
            VStack(alignment: .leading, spacing: 4) {
                Text(draft.badge.isEmpty ? "SALE" : draft.badge.uppercased())
                    .font(.system(size: 10, weight: .heavy))
                    .tracking(0.8)
                    .foregroundColor(.yellow)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color.black.opacity(0.5), in: RoundedRectangle(cornerRadius: 6))
                Text(draft.title.isEmpty ? "Name of the sale" : draft.title)
                    .font(.system(size: 20, weight: .heavy))
                    .foregroundColor(.white)
                Text(draft.subtitle.isEmpty ? "A line about the sale" : draft.subtitle)
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.85))
                    .lineLimit(2)
                HStack {
                    Text(draft.priceTag.isEmpty ? "What customers get" : draft.priceTag)
                        .font(.system(size: 14, weight: .heavy))
                        .foregroundColor(.yellow)
                    Spacer()
                    if !draft.promoCode.isEmpty {
                        Text(draft.promoCode)
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(Color.white.opacity(0.2), in: RoundedRectangle(cornerRadius: 6))
                    }
                }
                .padding(.top, 6)
                Text(draft.expiresText)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.white.opacity(0.7))
            }
            .padding(16)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 200)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .padding(.vertical, 4)
    }
}
