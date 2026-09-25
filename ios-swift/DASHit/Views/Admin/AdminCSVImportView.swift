import SwiftUI
import UniformTypeIdentifiers

/// Import items from a CSV file (Excel can save one). After the file is picked
/// the owner says who the stock came from, then checks every line before saving.
struct AdminCSVImportView: View {
    @ObservedObject var vm: AdminDashboardViewModel

    @State private var isPickingFile = false
    @State private var fileName = ""
    @State private var fileText = ""
    @State private var plan: CSVStockImport.Plan?
    @State private var source = Distributor.selfName
    @State private var mode: CSVStockImport.Mode = .add
    @State private var isSourceSheetOpen = false
    @State private var isSaving = false
    @State private var alertMessage: String?

    private var sampleFileURL: URL {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("dashit-sample.csv")
        try? CSVStockImport.sample.write(to: url, atomically: true, encoding: .utf8)
        return url
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                if let plan {
                    review(plan)
                } else {
                    chooser
                }
            }
            .padding(16)
            .padding(.bottom, 30)
        }
        .fileImporter(
            isPresented: $isPickingFile,
            allowedContentTypes: [.commaSeparatedText, .tabSeparatedText, .plainText]
        ) { result in
            guard case .success(let url) = result else { return }
            read(url)
        }
        .sheet(isPresented: $isSourceSheetOpen) {
            StockSourceSheetView(
                distributors: vm.distributors.filter { !$0.isSelf },
                initial: source,
                onAddDistributor: { name, phone in vm.addDistributor(name: name, phone: phone) },
                onChoose: { name in
                    source = name
                    isSourceSheetOpen = false
                    plan = CSVStockImport.plan(from: fileText, existing: vm.products)
                }
            )
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
        }
        .alert(alertMessage ?? "", isPresented: Binding(
            get: { alertMessage != nil },
            set: { if !$0 { alertMessage = nil } }
        )) {
            Button("OK", role: .cancel) {}
        }
    }

    // MARK: - Choose a file

    private var chooser: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Import from a file")
                    .font(.system(size: 18, weight: .bold))
                Text("Add new items or more stock from an Excel or CSV file. Nothing is saved until you check the list and confirm.")
                    .font(.system(size: 13))
                    .foregroundColor(.secondary)
            }

            Button {
                isPickingFile = true
            } label: {
                VStack(spacing: 8) {
                    Image(systemName: "doc.badge.plus")
                        .font(.system(size: 28))
                        .foregroundColor(.orange)
                    Text("Choose a CSV file")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.primary)
                    Text("In Excel, use File → Save As → CSV.")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 28)
                .background(Color(uiColor: .secondarySystemGroupedBackground))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .strokeBorder(Color.secondary.opacity(0.35), style: StrokeStyle(lineWidth: 1.5, dash: [6, 5]))
                )
                .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .buttonStyle(.plain)

            ShareLink(item: sampleFileURL) {
                Label("Get a sample file", systemImage: "square.and.arrow.down")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.orange)
            }
        }
    }

    private func read(_ url: URL) {
        let didAccess = url.startAccessingSecurityScopedResource()
        defer { if didAccess { url.stopAccessingSecurityScopedResource() } }
        guard let data = try? Data(contentsOf: url) else {
            alertMessage = "Couldn't open that file."
            return
        }
        let text = String(data: data, encoding: .utf8)
            ?? String(data: data, encoding: .windowsCP1252)
            ?? String(data: data, encoding: .isoLatin1)
            ?? ""
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            alertMessage = "That file is empty."
            return
        }
        fileName = url.lastPathComponent
        fileText = text
        isSourceSheetOpen = true
    }

    // MARK: - Check before saving

    private func review(_ plan: CSVStockImport.Plan) -> some View {
        let chosen = plan.items.filter { $0.include && $0.problem == nil }
        let units = chosen.reduce(0) { $0 + $1.qty }
        let newCount = chosen.filter { $0.isNew }.count
        let saveTitle: String = isSaving
            ? "Saving…"
            : chosen.isEmpty ? "Nothing selected" : "Save \(chosen.count) \(chosen.count == 1 ? "item" : "items") (\(units) units)"

        return VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Check before saving")
                        .font(.system(size: 18, weight: .bold))
                    Text("\(fileName) · \(plan.items.count) \(plan.items.count == 1 ? "item" : "items"). Untick anything you don't want.")
                        .font(.system(size: 13))
                        .foregroundColor(.secondary)
                }
                Spacer()
                Button {
                    reset()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 22))
                        .foregroundColor(.secondary)
                }
                .accessibilityLabel("Cancel this import")
            }

            // Who it's from
            HStack(spacing: 12) {
                Image(systemName: source == Distributor.selfName ? "person.fill" : "shippingbox.fill")
                    .font(.system(size: 15))
                    .foregroundColor(.orange)
                    .frame(width: 36, height: 36)
                    .background(Color.orange.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                VStack(alignment: .leading, spacing: 1) {
                    Text("From")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.secondary)
                    Text(source)
                        .font(.system(size: 15, weight: .bold))
                        .lineLimit(1)
                }
                Spacer()
                Button("Change") { isSourceSheetOpen = true }
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.orange)
            }
            .padding(12)
            .background(Color(uiColor: .secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))

            VStack(alignment: .leading, spacing: 6) {
                Picker("How to save", selection: $mode) {
                    ForEach(CSVStockImport.Mode.allCases) { m in
                        Text(m.title).tag(m)
                    }
                }
                .pickerStyle(.segmented)
                Text(mode.hint)
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
            }

            Text("\(newCount) new · \(chosen.count - newCount) more stock · \(units) units")
                .font(.system(size: 13, weight: .semibold))

            if plan.missingName {
                Label("No name column found. Check the first row of the file.", systemImage: "exclamationmark.triangle.fill")
                    .font(.system(size: 12))
                    .foregroundColor(.orange)
            }
            ForEach(plan.skipped, id: \.self) { line in
                Label("\(line). Left out.", systemImage: "minus.circle")
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
            }

            VStack(spacing: 0) {
                ForEach(plan.items) { item in
                    row(item)
                    if item.id != plan.items.last?.id {
                        Divider().padding(.leading, 44)
                    }
                }
            }
            .background(Color(uiColor: .secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))

            Button {
                save(chosen)
            } label: {
                Text(saveTitle)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color.orange.opacity(chosen.isEmpty || isSaving ? 0.45 : 1))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(chosen.isEmpty || isSaving)
        }
    }

    private func row(_ item: CSVStockImport.Item) -> some View {
        let changes = item.changes(from: source)
        return Button {
            toggle(item)
        } label: {
            HStack(spacing: 12) {
                Image(systemName: item.problem != nil ? "exclamationmark.circle" : item.include ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 20))
                    .foregroundColor(item.problem != nil ? .secondary : item.include ? .orange : .secondary)
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.name)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.primary)
                        .lineLimit(1)
                    Text("\(item.isNew ? "New" : "More stock") · \(item.unit.isEmpty ? "—" : item.unit) · ₹\(CSVStockImport.Item.money(item.shownPrice))")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                    if let problem = item.problem {
                        Text(problem)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.red)
                    } else if !changes.isEmpty {
                        Text(changes.joined(separator: " · "))
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.orange)
                    }
                }
                Spacer(minLength: 8)
                VStack(alignment: .trailing, spacing: 2) {
                    Text("+\(item.qty)")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.primary)
                    Text("\(item.currentStock) → \(item.newStock(mode))")
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                }
            }
            .padding(12)
            .opacity(item.include || item.problem != nil ? 1 : 0.5)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(item.problem != nil)
    }

    private func toggle(_ item: CSVStockImport.Item) {
        guard var current = plan, let index = current.items.firstIndex(where: { $0.id == item.id }) else { return }
        current.items[index].include.toggle()
        plan = current
        UISelectionFeedbackGenerator().selectionChanged()
    }

    private func save(_ chosen: [CSVStockImport.Item]) {
        guard !chosen.isEmpty, !isSaving else { return }
        isSaving = true
        Task {
            do {
                let count = try await vm.applyCSVImport(chosen, mode: mode, distributor: source)
                isSaving = false
                reset()
                alertMessage = "Saved \(count) \(count == 1 ? "item" : "items")."
            } catch {
                isSaving = false
                alertMessage = "Couldn't save. Check you're signed in as the owner, then try again."
            }
        }
    }

    private func reset() {
        plan = nil
        fileText = ""
        fileName = ""
        mode = .add
    }
}

// MARK: - Who did you get this stock from?

/// Myself, a distributor added before, or a new one saved on the spot.
struct StockSourceSheetView: View {
    let distributors: [Distributor]
    let initial: String
    var onAddDistributor: (String, String) -> String
    var onChoose: (String) -> Void

    @State private var choice: String = Distributor.selfName
    @State private var newName = ""
    @State private var newPhone = ""
    @FocusState private var nameFocused: Bool

    private let newTag = "__new__"

    private var canContinue: Bool {
        choice != newTag || !newName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Who did you get this stock from?")
                    .font(.system(size: 20, weight: .bold))
                Text("Every item in this file will be marked as from them.")
                    .font(.system(size: 13))
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal, 20)
            .padding(.top, 24)
            .padding(.bottom, 14)

            ScrollView {
                VStack(alignment: .leading, spacing: 8) {
                    option(tag: Distributor.selfName, title: "Myself", subtitle: "My own stock", icon: "person.fill")

                    if !distributors.isEmpty {
                        Text("Distributors you added")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.secondary)
                            .padding(.top, 8)
                            .padding(.leading, 4)
                        ForEach(distributors) { d in
                            option(tag: d.name, title: d.name, subtitle: d.phone.isEmpty ? nil : d.phone, icon: "shippingbox.fill")
                        }
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        option(tag: newTag, title: "New distributor", subtitle: "Add someone new", icon: "plus", framed: false)
                        if choice == newTag {
                            TextField("Name", text: $newName)
                                .textContentType(.organizationName)
                                .focused($nameFocused)
                                .padding(12)
                                .background(Color(uiColor: .tertiarySystemFill))
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                            TextField("Phone (optional)", text: $newPhone)
                                .keyboardType(.phonePad)
                                .padding(12)
                                .background(Color(uiColor: .tertiarySystemFill))
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                        }
                    }
                    .padding(choice == newTag ? 12 : 0)
                    .background(choice == newTag ? Color.orange.opacity(0.08) : Color.clear)
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .strokeBorder(choice == newTag ? Color.orange : Color.clear, lineWidth: 1.5)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 12)
            }

            Button {
                if choice == newTag {
                    let saved = onAddDistributor(newName, newPhone)
                    onChoose(saved)
                } else {
                    onChoose(choice)
                }
            } label: {
                Text("Continue")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 15)
                    .background(Color.orange.opacity(canContinue ? 1 : 0.45))
                    .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .disabled(!canContinue)
            .padding(.horizontal, 20)
            .padding(.bottom, 12)
        }
        .onAppear {
            choice = distributors.contains(where: { $0.name == initial }) ? initial : Distributor.selfName
        }
        .onChange(of: choice) { _, value in
            nameFocused = value == newTag
        }
    }

    private func option(tag: String, title: String, subtitle: String?, icon: String, framed: Bool = true) -> some View {
        let selected = choice == tag
        return Button {
            UISelectionFeedbackGenerator().selectionChanged()
            choice = tag
        } label: {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(tag == Distributor.selfName ? .orange : .primary)
                    .frame(width: 36, height: 36)
                    .background(tag == Distributor.selfName ? Color.orange.opacity(0.12) : Color(uiColor: .tertiarySystemFill))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                VStack(alignment: .leading, spacing: 1) {
                    Text(title)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.primary)
                        .lineLimit(1)
                    if let subtitle {
                        Text(subtitle)
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                    }
                }
                Spacer()
                Image(systemName: selected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 20))
                    .foregroundColor(selected ? .orange : Color(uiColor: .tertiaryLabel))
            }
            .padding(framed ? 12 : 0)
            .background(framed ? (selected ? Color.orange.opacity(0.08) : Color(uiColor: .secondarySystemGroupedBackground)) : Color.clear)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .strokeBorder(framed && selected ? Color.orange : Color.clear, lineWidth: 1.5)
            )
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
