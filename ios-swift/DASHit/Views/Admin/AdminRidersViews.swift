import SwiftUI

/// The riders tab: who is waiting for approval, every rider with an on/off
/// switch, and adding a rider. Kept to plain words, so the owner never needs
/// showing how it works.
struct AdminRidersTab: View {
    @ObservedObject var vm: AdminDashboardViewModel
    @State private var isAddOpen = false
    @State private var busyId: String?
    @State private var message: String?
    @State private var pinFor: Driver?

    var body: some View {
        List {
            Section {
                Button {
                    isAddOpen = true
                } label: {
                    Label("Add a rider", systemImage: "person.badge.plus")
                        .font(.system(size: 16, weight: .semibold))
                }
            } footer: {
                Text("Riders can also sign up themselves in the rider app. They show up below to approve.")
            }

            if let message {
                Section {
                    Text(message).foregroundColor(.red).font(.system(size: 14))
                }
            }

            if !vm.waitingDrivers.isEmpty {
                Section("Waiting for your approval (\(vm.waitingDrivers.count))") {
                    ForEach(vm.waitingDrivers) { driver in
                        HStack(spacing: 12) {
                            riderAvatar(driver)
                            riderText(driver)
                            Spacer()
                            if busyId == driver.id {
                                ProgressView()
                            } else {
                                Button("Approve") { set(driver, approved: true) }
                                    .buttonStyle(.borderedProminent)
                                    .tint(.green)
                            }
                        }
                    }
                }
            }

            Section {
                if vm.drivers.filter({ !$0.isWaiting }).isEmpty {
                    Text("No riders yet. Add one above, or approve one who signed up.")
                        .foregroundColor(.secondary)
                }
                ForEach(vm.drivers.filter { !$0.isWaiting }) { driver in
                    HStack(spacing: 12) {
                        riderAvatar(driver)
                        riderText(driver, load: vm.activeOrderCount(for: driver))
                        Spacer()
                        if busyId == driver.id {
                            ProgressView()
                        } else {
                            Toggle("Can deliver", isOn: Binding(
                                get: { driver.isApproved },
                                set: { set(driver, approved: $0) }
                            ))
                            .labelsHidden()
                        }
                    }
                    .contextMenu {
                        Button {
                            pinFor = driver
                        } label: {
                            Label("Give a new PIN", systemImage: "key")
                        }
                        if let url = URL(string: "tel:\(driver.phone.filter { "0123456789+".contains($0) })"), !driver.phone.isEmpty {
                            Link(destination: url) { Label("Call \(driver.name)", systemImage: "phone") }
                        }
                    }
                }
            } header: {
                Text("Riders (\(vm.drivers.filter { !$0.isWaiting }.count))")
            } footer: {
                Text("Switch a rider off and they can't sign in or get orders. Press and hold a rider to give them a new PIN or call them.")
            }
        }
        .listStyle(.insetGrouped)
        .sheet(isPresented: $isAddOpen) {
            AddRiderSheet(vm: vm)
        }
        .sheet(item: $pinFor) { driver in
            NewPinSheet(vm: vm, driver: driver)
        }
    }

    private func set(_ driver: Driver, approved: Bool) {
        busyId = driver.id
        message = nil
        Task {
            let error = await vm.setDriver(driver, approved: approved)
            busyId = nil
            message = error
        }
    }
}

private func riderAvatar(_ driver: Driver) -> some View {
    ZStack {
        Circle().fill(driver.isApproved ? Color.orange.opacity(0.15) : Color.gray.opacity(0.15))
        Text(String(driver.name.prefix(1)).uppercased())
            .font(.system(size: 17, weight: .bold))
            .foregroundColor(driver.isApproved ? .orange : .gray)
    }
    .frame(width: 42, height: 42)
}

private func riderText(_ driver: Driver, load: Int = 0) -> some View {
    VStack(alignment: .leading, spacing: 2) {
        Text(driver.name).font(.system(size: 16, weight: .semibold))
        Text([driver.phone.isEmpty ? nil : driver.phone,
              driver.isWaiting ? "Waiting" : driver.isApproved ? (load > 0 ? "Carrying \(load) order\(load == 1 ? "" : "s")" : "Free") : "Switched off"]
            .compactMap { $0 }.joined(separator: " · "))
            .font(.system(size: 13))
            .foregroundColor(.secondary)
    }
}

/// Adding a rider: name, phone and the 4-digit PIN they sign in with.
struct AddRiderSheet: View {
    @ObservedObject var vm: AdminDashboardViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var phone = ""
    @State private var pin = ""
    @State private var isSaving = false
    @State private var error: String?

    private var digits: String { String(phone.filter(\.isNumber).suffix(10)) }
    private var canSave: Bool { name.trimmingCharacters(in: .whitespaces).count >= 2 && digits.count == 10 && pin.count == 4 && !isSaving }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Rider's name", text: $name)
                        .textContentType(.name)
                    TextField("Phone number (10 digits)", text: $phone)
                        .keyboardType(.phonePad)
                    TextField("4-digit PIN", text: $pin)
                        .keyboardType(.numberPad)
                        .onChange(of: pin) { _, value in pin = String(value.filter(\.isNumber).prefix(4)) }
                } footer: {
                    Text("Tell the rider their phone number and PIN: they sign in to the rider app with them. They can start delivering straight away.")
                }
                if let error {
                    Section { Text(error).foregroundColor(.red) }
                }
            }
            .navigationTitle("Add a rider")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    if isSaving { ProgressView() } else {
                        Button("Add") { save() }.disabled(!canSave)
                    }
                }
            }
        }
    }

    private func save() {
        isSaving = true
        error = nil
        Task {
            let result = await vm.addDriver(name: name.trimmingCharacters(in: .whitespaces), phone: digits, pin: pin)
            isSaving = false
            if let result { error = result } else { dismiss() }
        }
    }
}

private struct NewPinSheet: View {
    @ObservedObject var vm: AdminDashboardViewModel
    let driver: Driver
    @Environment(\.dismiss) private var dismiss
    @State private var pin = ""
    @State private var isSaving = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("New 4-digit PIN", text: $pin)
                        .keyboardType(.numberPad)
                        .onChange(of: pin) { _, value in pin = String(value.filter(\.isNumber).prefix(4)) }
                } footer: {
                    Text("\(driver.name) signs in with their phone number and this PIN from now on.")
                }
                if let error { Section { Text(error).foregroundColor(.red) } }
            }
            .navigationTitle("New PIN")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    if isSaving { ProgressView() } else {
                        Button("Save") {
                            isSaving = true
                            Task {
                                let result = await vm.resetPin(driver, pin: pin)
                                isSaving = false
                                if let result { error = result } else { dismiss() }
                            }
                        }
                        .disabled(pin.count != 4)
                    }
                }
            }
        }
        .presentationDetents([.medium])
    }
}
