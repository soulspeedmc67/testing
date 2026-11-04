import SwiftUI
import PhotosUI
import FirebaseFirestore

/// The admin's editor for the special gold tab (`Spotlight.swift`, saved on
/// `config/spotlight`), the twin of the website console's "Special tab"
/// (`SpotlightEditor.jsx`). Groups and items both need a photo. "New item"
/// makes a real product in the stock; "Add from stock" picks items already
/// sold. Nothing reaches customers until Save, which is grey while there is
/// nothing new and says when it has saved.
struct AdminSpotlightView: View {
    @ObservedObject var vm: AdminDashboardViewModel

    @State private var saved: Spotlight? = nil
    @State private var draft = Spotlight()
    @State private var listener: ListenerRegistration? = nil
    @State private var isSaving = false
    /// The on/off switch is being written.
    @State private var isSwitching = false
    @State private var triedSave = false
    @State private var note: (ok: Bool, text: String)? = nil
    @State private var noteTask: Task<Void, Never>? = nil

    @State private var groupSheet: GroupDraft? = nil
    @State private var newItemFor: SectionRef? = nil
    @State private var stockFor: SectionRef? = nil

    struct SectionRef: Identifiable { let id: String }
    /// The sheets' target for items on their own (not in any group).
    static let looseId = "__loose"
    struct GroupDraft: Identifiable {
        let id = UUID()
        var sectionId: String?
        var name: String
        var img: String
    }

    private var hasChanges: Bool {
        guard let saved else { return false }
        return draft != saved
    }

    var body: some View {
        Form {
            if saved == nil {
                Section {
                    HStack(spacing: 10) {
                        ProgressView()
                        Text("Loading the special tab…").foregroundColor(.secondary)
                    }
                }
            } else {
                tabSection
                looseSection
                ForEach(draft.sections) { section in
                    groupSection(section)
                }
                Section {
                    Button {
                        groupSheet = GroupDraft(sectionId: nil, name: "", img: "")
                    } label: {
                        Label("Add group", systemImage: "plus.rectangle.on.rectangle")
                            .font(.system(size: 17, weight: .semibold))
                    }
                    .disabled(draft.sections.count >= Spotlight.maxSections)
                } header: {
                    Text("Groups (optional)")
                } footer: {
                    Text("Groups are optional. Each one is a photo tile on the special page, with its items under it. A group with no items isn't shown. Up to \(Spotlight.maxSections) groups.")
                }
                if triedSave, !draft.problems.isEmpty {
                    Section {
                        ForEach(draft.problems, id: \.self) { problem in
                            Label(problem, systemImage: "exclamationmark.triangle.fill")
                                .foregroundColor(.red)
                        }
                    } header: {
                        Text("Fix these to save")
                    }
                }
            }
        }
        .navigationTitle(AdminTab.spotlight.rawValue)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button(action: save) {
                    if isSaving {
                        HStack(spacing: 6) {
                            ProgressView()
                            Text("Saving…")
                        }
                    } else {
                        Text(hasChanges ? "Save" : "Saved")
                    }
                }
                .font(.system(size: 17, weight: .bold))
                .disabled(!hasChanges || isSaving)
            }
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if let note {
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: note.ok ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(note.ok ? .green : .orange)
                    Text(note.text)
                        .font(.system(size: 15, weight: .semibold))
                        .fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: 0)
                }
                .padding(14)
                .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .padding(.horizontal, 16)
                .padding(.bottom, 10)
                .transition(.move(edge: .bottom).combined(with: .opacity))
                .accessibilityElement(children: .combine)
            }
        }
        .animation(.spring(response: 0.35, dampingFraction: 0.85), value: note?.text)
        .onAppear(perform: startListening)
        .onDisappear {
            listener?.remove()
            listener = nil
            noteTask?.cancel()
        }
        .sheet(item: $groupSheet) { group in
            SpotlightGroupSheet(vm: vm, group: group) { name, img in
                if let id = group.sectionId, let index = draft.sections.firstIndex(where: { $0.id == id }) {
                    draft.sections[index].name = name
                    draft.sections[index].img = img
                } else {
                    draft.sections.append(Spotlight.Section(id: Spotlight.newSectionId(), name: name, img: img, items: []))
                }
            }
        }
        .sheet(item: $newItemFor) { ref in
            SpotlightNewItemSheet(vm: vm) { item in
                append([item], to: ref.id)
                show(ok: true, "“\(item.name)” is in your stock and on the special page. Tap Save to show it.")
            }
        }
        .sheet(item: $stockFor) { ref in
            SpotlightStockPicker(
                products: vm.products,
                taken: Set(items(in: ref.id).map(\.id)),
                room: Spotlight.maxItems - items(in: ref.id).count
            ) { picked in
                append(picked.map(Spotlight.item(from:)), to: ref.id)
            }
        }
    }

    // MARK: - Sections

    @ViewBuilder
    private var tabSection: some View {
        Section {
            // Works at once, any time, without Save.
            HStack {
                Toggle(isOn: Binding(get: { saved?.enabled ?? false }, set: { switchLive($0) })) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text((saved?.enabled ?? false) ? "On: customers see it" : "Off: customers don't see it")
                            .font(.system(size: 17, weight: .semibold))
                        Text("Switches at once. No Save needed.")
                            .font(.system(size: 13))
                            .foregroundColor(.secondary)
                    }
                }
                .tint(Color(hex: 0xE0A200))
                .disabled(isSwitching)
                if isSwitching { ProgressView().padding(.leading, 6) }
            }
        } header: {
            Text("Show the special tab")
        }
        Section {
            TextField("Tab name, e.g. Diwali", text: $draft.tabLabel)
            TextField("Heading, e.g. Furnishing & Dining", text: $draft.title)
            TextField("Line under the heading (optional)", text: $draft.subtitle)
        } header: {
            Text("Words")
        } footer: {
            Text("A gold tab next to “All” on the home screen of the website and both apps. Tapping it turns the home screen gold and shows your groups and items.")
        }
    }

    private func groupSection(_ section: Spotlight.Section) -> some View {
        let index = draft.sections.firstIndex(where: { $0.id == section.id }) ?? 0
        return Section {
            HStack(spacing: 12) {
                photo(section.img, size: CGSize(width: 48, height: 58))
                VStack(alignment: .leading, spacing: 2) {
                    Text(section.name.isEmpty ? "Unnamed group" : section.name)
                        .font(.system(size: 17, weight: .semibold))
                    Text("\(section.items.count) item\(section.items.count == 1 ? "" : "s")")
                        .font(.system(size: 13))
                        .foregroundColor(.secondary)
                }
                Spacer()
                Menu {
                    Button("Change name or photo", systemImage: "pencil") {
                        groupSheet = GroupDraft(sectionId: section.id, name: section.name, img: section.img)
                    }
                    Button("Move up", systemImage: "arrow.up") { moveSection(from: index, to: index - 1) }
                        .disabled(index == 0)
                    Button("Move down", systemImage: "arrow.down") { moveSection(from: index, to: index + 1) }
                        .disabled(index >= draft.sections.count - 1)
                    Button("Delete group", systemImage: "trash", role: .destructive) {
                        draft.sections.removeAll { $0.id == section.id }
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .font(.system(size: 22))
                }
                .accessibilityLabel("Group options")
            }

            ForEach(section.items) { item in
                HStack(spacing: 12) {
                    photo(item.img, size: CGSize(width: 40, height: 40))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.name)
                            .font(.system(size: 15, weight: .semibold))
                            .lineLimit(2)
                        Text(priceLine(item))
                            .font(.system(size: 13))
                            .foregroundColor(.secondary)
                    }
                }
            }
            .onDelete { offsets in
                guard let i = draft.sections.firstIndex(where: { $0.id == section.id }) else { return }
                draft.sections[i].items.remove(atOffsets: offsets)
            }
            .onMove { from, to in
                guard let i = draft.sections.firstIndex(where: { $0.id == section.id }) else { return }
                draft.sections[i].items.move(fromOffsets: from, toOffset: to)
            }

            addButtons(for: section.id, count: section.items.count)
        } header: {
            Text(section.name.isEmpty ? "Group" : section.name)
        } footer: {
            if !section.items.isEmpty {
                Text("Swipe an item left to take it out of the group (it stays in your stock). Touch and hold to move it.")
            }
        }
    }

    /// Items on their own: no group needed.
    private var looseSection: some View {
        Section {
            ForEach(draft.items) { item in
                itemRow(item)
            }
            .onDelete { draft.items.remove(atOffsets: $0) }
            .onMove { draft.items.move(fromOffsets: $0, toOffset: $1) }
            addButtons(for: Self.looseId, count: draft.items.count)
        } header: {
            Text("Items on their own")
        } footer: {
            Text("No group needed: these show straight under the heading. With groups too, they show as “Top picks” after the group tiles. Swipe left to take one out (it stays in your stock).")
        }
    }

    private func itemRow(_ item: Spotlight.Item) -> some View {
        HStack(spacing: 12) {
            photo(item.img, size: CGSize(width: 40, height: 40))
            VStack(alignment: .leading, spacing: 2) {
                Text(item.name)
                    .font(.system(size: 15, weight: .semibold))
                    .lineLimit(2)
                Text(priceLine(item))
                    .font(.system(size: 13))
                    .foregroundColor(.secondary)
            }
        }
    }

    /// "New item" and, as its own button, "Add from stock".
    private func addButtons(for sectionId: String, count: Int) -> some View {
        HStack(spacing: 10) {
            Button {
                newItemFor = SectionRef(id: sectionId)
            } label: {
                Label("New item", systemImage: "shippingbox")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            Button {
                stockFor = SectionRef(id: sectionId)
            } label: {
                Label("Add from stock", systemImage: "square.grid.2x2")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
        }
        .font(.system(size: 15, weight: .semibold))
        .tint(Color(hex: 0xB26B00))
        .disabled(count >= Spotlight.maxItems)
    }

    private func items(in sectionId: String) -> [Spotlight.Item] {
        sectionId == Self.looseId ? draft.items : (draft.sections.first { $0.id == sectionId }?.items ?? [])
    }

    private func photo(_ link: String, size: CGSize) -> some View {
        AsyncImage(url: URL(string: link)) { image in
            image.resizable().scaledToFit()
        } placeholder: {
            Image(systemName: "photo")
                .foregroundColor(.secondary)
        }
        .frame(width: size.width, height: size.height)
        .background(Color(hex: 0xFFF3C4), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private func priceLine(_ item: Spotlight.Item) -> String {
        var line = CurrencyFormatter.format(item.price)
        if item.mrp > item.price { line += " (MRP \(CurrencyFormatter.format(item.mrp)))" }
        if !item.unit.isEmpty { line += " · \(item.unit)" }
        return line
    }

    // MARK: - Changes

    private func moveSection(from: Int, to: Int) {
        guard to >= 0, to < draft.sections.count else { return }
        let section = draft.sections.remove(at: from)
        draft.sections.insert(section, at: to)
    }

    private func append(_ items: [Spotlight.Item], to sectionId: String) {
        if sectionId == Self.looseId {
            let have = Set(draft.items.map(\.id))
            let fresh = items.filter { !have.contains($0.id) }
            draft.items.append(contentsOf: fresh.prefix(max(0, Spotlight.maxItems - draft.items.count)))
            return
        }
        guard let i = draft.sections.firstIndex(where: { $0.id == sectionId }) else { return }
        let have = Set(draft.sections[i].items.map(\.id))
        let fresh = items.filter { !have.contains($0.id) }
        draft.sections[i].items.append(contentsOf: fresh.prefix(max(0, Spotlight.maxItems - draft.sections[i].items.count)))
    }

    private func startListening() {
        guard listener == nil else { return }
        listener = Firestore.firestore().collection("config").document("spotlight").addSnapshotListener { snapshot, _ in
            guard let snapshot else { return }
            let fetched = Spotlight(data: snapshot.data() ?? [:])
            // An untouched page follows a save made elsewhere.
            if saved == nil || draft == saved { draft = fetched }
            saved = fetched
        }
    }

    /// Switches the tab on or off at once: only `enabled` is written, so unsaved edits stay unsaved.
    private func switchLive(_ on: Bool) {
        guard let current = saved, !isSwitching, on != current.enabled else { return }
        if on && !current.hasAnyItem {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            show(ok: false, "Add at least one item and Save it first, then switch the tab on.")
            return
        }
        isSwitching = true
        let ref = Firestore.firestore().collection("config").document("spotlight")
        Task {
            let outcome = await vm.awaitWrite("The switch") { done in
                ref.setData(["enabled": on, "updatedAt": FieldValue.serverTimestamp()], merge: true, completion: done)
            }
            isSwitching = false
            switch outcome {
            case .saved, .waiting:
                saved?.enabled = on
                draft.enabled = on
                UINotificationFeedbackGenerator().notificationOccurred(outcome == .saved ? .success : .warning)
                if outcome == .waiting {
                    show(ok: false, "No answer from the server yet. It switches as soon as the internet is back.")
                } else {
                    show(ok: true, on ? "Switched on. Customers see “\(current.tabLabel)” on the home screen now." : "Switched off. Customers don't see the special tab now.")
                }
            case .failed(let text):
                UINotificationFeedbackGenerator().notificationOccurred(.error)
                show(ok: false, text)
            }
        }
    }

    private func save() {
        triedSave = true
        guard hasChanges, !isSaving else { return }
        guard draft.problems.isEmpty else {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            show(ok: false, draft.problems.first ?? "")
            return
        }
        isSaving = true
        let fields = draft.fields.merging(["updatedAt": FieldValue.serverTimestamp()]) { _, new in new }
        let ref = Firestore.firestore().collection("config").document("spotlight")
        let snapshot = draft
        Task {
            let outcome = await vm.awaitWrite("The special tab") { done in
                ref.setData(fields, completion: done)
            }
            isSaving = false
            switch outcome {
            case .saved:
                saved = snapshot
                triedSave = false
                UINotificationFeedbackGenerator().notificationOccurred(.success)
                show(ok: true, snapshot.enabled
                     ? "Saved. Customers see “\(snapshot.tabLabel)” on the home screen now."
                     : "Saved. The tab is off, so customers don't see it.")
            case .waiting:
                show(ok: false, "Saved on this phone. It reaches customers as soon as the internet is back.")
            case .failed(let text):
                UINotificationFeedbackGenerator().notificationOccurred(.error)
                show(ok: false, text)
            }
        }
    }

    private func show(ok: Bool, _ text: String) {
        note = (ok, text)
        noteTask?.cancel()
        noteTask = Task {
            try? await Task.sleep(for: .seconds(ok ? 3.5 : 7))
            guard !Task.isCancelled else { return }
            note = nil
        }
    }
}

// MARK: - Photo that must be there

/// Choose a photo from the phone (uploaded to the website) or paste a link.
private struct RequiredPhotoField: View {
    @ObservedObject var vm: AdminDashboardViewModel
    @Binding var link: String
    var tall = false
    /// A ready-made prompt for an AI image tool, shown with a Copy button.
    var prompt: String = ""
    @State private var copied = false

    @State private var picked: PhotosPickerItem? = nil
    @State private var isUploading = false
    @State private var error: String? = nil

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Color(hex: 0xFFF3C4))
                if Spotlight.isPhoto(link) {
                    AsyncImage(url: URL(string: link)) { image in
                        image.resizable().scaledToFit()
                    } placeholder: {
                        ProgressView()
                    }
                    .padding(4)
                } else {
                    Image(systemName: "photo.badge.plus")
                        .font(.system(size: 24))
                        .foregroundColor(Color(hex: 0xB26B00))
                }
                if isUploading {
                    Color.black.opacity(0.45)
                    ProgressView().tint(.white)
                }
            }
            .frame(width: 92, height: tall ? 112 : 92)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

            VStack(alignment: .leading, spacing: 8) {
                PhotosPicker(selection: $picked, matching: .images) {
                    Label(Spotlight.isPhoto(link) ? "Change photo" : "Choose photo", systemImage: "photo.on.rectangle")
                        .font(.system(size: 16, weight: .semibold))
                }
                .disabled(isUploading)
                Text("Needed. A cut-out on a plain background looks best.")
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
                if let error {
                    Text(error)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.red)
                }
            }
        }
        .padding(.vertical, 4)
        .onChange(of: picked) { _, item in
            guard let item else { return }
            Task {
                defer { picked = nil }
                guard let data = try? await item.loadTransferable(type: Data.self), let image = UIImage(data: data) else {
                    error = "That photo couldn't be read. Try another one."
                    return
                }
                isUploading = true
                error = nil
                defer { isUploading = false }
                do {
                    link = try await vm.uploadProductPhoto(image)
                } catch {
                    self.error = error.localizedDescription
                }
            }
        }
        TextField("…or paste a photo link (https://)", text: $link)
            .keyboardType(.URL)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .font(.system(size: 14))
        if !prompt.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("No photo? Use this prompt")
                        .font(.system(size: 12, weight: .heavy))
                        .foregroundColor(Color(hex: 0x8A5A00))
                    Spacer()
                    Button {
                        UIPasteboard.general.string = prompt
                        UINotificationFeedbackGenerator().notificationOccurred(.success)
                        copied = true
                        Task {
                            try? await Task.sleep(for: .seconds(1.8))
                            copied = false
                        }
                    } label: {
                        Label(copied ? "Copied" : "Copy", systemImage: copied ? "checkmark" : "doc.on.doc")
                            .font(.system(size: 13, weight: .bold))
                    }
                    .buttonStyle(.bordered)
                    .tint(Color(hex: 0xB26B00))
                }
                Text(prompt)
                    .font(.system(size: 13))
                    .foregroundColor(.secondary)
                    .textSelection(.enabled)
                    .fixedSize(horizontal: false, vertical: true)
                Text("Paste it into ChatGPT or Gemini, save the picture, then choose it above.")
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
            }
            .padding(.vertical, 4)
        }
    }
}

// MARK: - Group sheet

private struct SpotlightGroupSheet: View {
    @ObservedObject var vm: AdminDashboardViewModel
    let group: AdminSpotlightView.GroupDraft
    let onDone: (String, String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var img = ""

    private var cleanName: String { String(name.trimmingCharacters(in: .whitespacesAndNewlines).prefix(32)) }
    private var canSave: Bool { !cleanName.isEmpty && Spotlight.isPhoto(img) }

    var body: some View {
        NavigationStack {
            Form {
                Section("Name") {
                    TextField("e.g. Bedsheets & Towels", text: $name)
                }
                Section {
                    RequiredPhotoField(vm: vm, link: $img, tall: true, prompt: Spotlight.photoPrompt(group: true, name: name))
                } header: {
                    Text("Photo")
                } footer: {
                    Text(canSave ? "Ready." : "Add turns on once the group has a name and a photo.")
                }
            }
            .navigationTitle(group.sectionId == nil ? "New group" : "Change group")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(group.sectionId == nil ? "Add" : "Done") {
                        onDone(cleanName, img.trimmingCharacters(in: .whitespaces))
                        dismiss()
                    }
                    .font(.system(size: 17, weight: .bold))
                    .disabled(!canSave)
                }
            }
            .onAppear {
                name = group.name
                img = group.img
            }
        }
    }
}

// MARK: - New item sheet

/// A brand-new item, made a real product in the stock so it can be ordered and counted.
private struct SpotlightNewItemSheet: View {
    @ObservedObject var vm: AdminDashboardViewModel
    let onCreated: (Spotlight.Item) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var price = ""
    @State private var mrp = ""
    @State private var unit = ""
    @State private var stock = "10"
    @State private var cat = "Home Care"
    @State private var img = ""
    @State private var isAdding = false
    @State private var error: String? = nil

    private let categories = ["Home Care", "Kitchen Care", "Staples", "Dairy", "Bakery", "Fruits", "Snacks", "Biscuits", "Beverages", "Instant Food", "Spices", "Personal Care", "Toys & Games", "Stationery", "Other"]

    private static func number(_ text: String) -> Double? {
        Double(text.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: ",", with: "."))
    }

    private var problems: [String] {
        var list: [String] = []
        if name.trimmingCharacters(in: .whitespaces).isEmpty { list.append("a name") }
        if (Self.number(price) ?? 0) <= 0 { list.append("a price") }
        if unit.trimmingCharacters(in: .whitespaces).isEmpty { list.append("a pack size") }
        if !Spotlight.isPhoto(img) { list.append("a photo") }
        if let m = Self.number(mrp), m > 0, m < (Self.number(price) ?? 0) { list.append("an MRP not below the price") }
        return list
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    RequiredPhotoField(vm: vm, link: $img, prompt: Spotlight.photoPrompt(group: false, name: name, unit: unit))
                } header: {
                    Text("Photo")
                }
                Section("About the item") {
                    TextField("Name, e.g. Reed Lavender Diffuser Set", text: $name)
                    TextField("Pack size, e.g. 1 set", text: $unit)
                    Picker("Also file it under", selection: $cat) {
                        ForEach(categories, id: \.self) { Text($0).tag($0) }
                    }
                }
                Section {
                    HStack {
                        Text("Price ₹")
                        Spacer()
                        TextField("339", text: $price).keyboardType(.decimalPad).multilineTextAlignment(.trailing).frame(width: 110)
                    }
                    HStack {
                        Text("MRP ₹ (optional)")
                        Spacer()
                        TextField("999", text: $mrp).keyboardType(.decimalPad).multilineTextAlignment(.trailing).frame(width: 110)
                    }
                    HStack {
                        Text("In stock")
                        Spacer()
                        TextField("10", text: $stock).keyboardType(.numberPad).multilineTextAlignment(.trailing).frame(width: 110)
                    }
                } header: {
                    Text("Price and stock")
                } footer: {
                    if let error {
                        Text(error).foregroundColor(.red)
                    } else if !problems.isEmpty {
                        Text("Add turns on once it has \(problems.joined(separator: ", ")).")
                    } else {
                        Text("It goes into your stock too, so it can be ordered and counted like any item.")
                    }
                }
            }
            .navigationTitle("New item")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(action: add) {
                        if isAdding { ProgressView() } else { Text("Add") }
                    }
                    .font(.system(size: 17, weight: .bold))
                    .disabled(!problems.isEmpty || isAdding)
                }
            }
        }
    }

    private func add() {
        guard problems.isEmpty, !isAdding else { return }
        isAdding = true
        error = nil
        let id = "SPOT-" + String(Int(Date().timeIntervalSince1970 * 1000), radix: 36).uppercased()
        let sellPrice = Self.number(price) ?? 0
        let listPrice = Self.number(mrp) ?? 0
        let count = max(0, Int(Self.number(stock) ?? 0))
        let cleanName = String(name.trimmingCharacters(in: .whitespacesAndNewlines).prefix(90))
        let cleanUnit = String(unit.trimmingCharacters(in: .whitespacesAndNewlines).prefix(24))
        let photo = img.trimmingCharacters(in: .whitespaces)
        var fields: [String: Any] = [
            "barcode": id,
            "name": cleanName,
            "price": sellPrice,
            "unit": cleanUnit,
            "img": photo,
            "cat": cat,
            "distributor": "Myself",
            "stock": count,
            "inStock": count > 0,
            "active": true,
            "createdAt": FieldValue.serverTimestamp(),
            "updatedAt": FieldValue.serverTimestamp()
        ]
        if listPrice > sellPrice { fields["originalPrice"] = listPrice }
        let ref = Firestore.firestore().collection("products").document(id)
        Task {
            let outcome = await vm.awaitWrite("The item") { done in
                ref.setData(fields, completion: done)
            }
            isAdding = false
            switch outcome {
            case .saved, .waiting:
                onCreated(Spotlight.Item(id: id, name: cleanName, img: photo, price: sellPrice, mrp: listPrice > sellPrice ? listPrice : 0, unit: cleanUnit))
                dismiss()
            case .failed(let text):
                error = text
            }
        }
    }
}

// MARK: - Add from stock

/// Items already sold. Tobacco and items without a photo can't be picked.
private struct SpotlightStockPicker: View {
    let products: [Product]
    let taken: Set<String>
    let room: Int
    let onPick: ([Product]) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    @State private var picked: [Product] = []

    private var results: [Product] {
        let words = ProductSearch.normalized(query).split(separator: " ").map(String.init)
        var list: [Product] = []
        for product in products where !taken.contains(product.id) && !product.isAgeRestricted {
            let hay = ProductSearch.normalized("\(product.name) \(product.cat)")
            if words.allSatisfy({ hay.contains($0) }) { list.append(product) }
            if list.count >= 80 { break }
        }
        return list
    }

    var body: some View {
        NavigationStack {
            List(results) { product in
                let hasPhoto = Spotlight.isPhoto(product.img)
                let isOn = picked.contains { $0.id == product.id }
                Button {
                    if isOn {
                        picked.removeAll { $0.id == product.id }
                    } else if picked.count < room {
                        picked.append(product)
                    }
                } label: {
                    HStack(spacing: 12) {
                        AsyncImage(url: URL(string: product.img)) { image in
                            image.resizable().scaledToFit()
                        } placeholder: {
                            Color(.secondarySystemBackground)
                        }
                        .frame(width: 44, height: 44)
                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                        VStack(alignment: .leading, spacing: 2) {
                            Text(product.name)
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(.primary)
                                .lineLimit(2)
                            Text("\(CurrencyFormatter.format(product.price)) · \(product.unit)\(hasPhoto ? "" : " · no photo")")
                                .font(.system(size: 13))
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                        Image(systemName: isOn ? "checkmark.circle.fill" : "circle")
                            .font(.system(size: 22))
                            .foregroundColor(isOn ? Color(hex: 0xB26B00) : .secondary)
                    }
                }
                .disabled(!hasPhoto)
                .opacity(hasPhoto ? 1 : 0.45)
            }
            .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Search your items")
            .navigationTitle("Add from stock")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(picked.isEmpty ? "Add" : "Add \(picked.count)") {
                        onPick(picked)
                        dismiss()
                    }
                    .font(.system(size: 17, weight: .bold))
                    .disabled(picked.isEmpty)
                }
            }
        }
    }
}
