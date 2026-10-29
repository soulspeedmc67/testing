import SwiftUI

/// Add money to one customer's wallet: type their mobile number, email or name,
/// pick them, enter the amount and confirm. The customer's apps show it at once,
/// and it works even while the welcome credit is off. Every addition is kept as a
/// record (`wallets/{uid}/grants`). Same tool as the staff console's card of the
/// same name (`src/lib/walletAdmin.js`).
struct AdminWalletView: View {
    @ObservedObject var vm: AdminDashboardViewModel

    @State private var text = ""
    @State private var results: [AdminDashboardViewModel.CustomerHit]?
    @State private var isSearching = false
    @State private var picked: AdminDashboardViewModel.CustomerHit?
    @State private var wallet: (bonus: Int, used: Int)?
    @State private var amountText = ""
    @State private var note = ""
    @State private var isSaving = false
    @State private var isConfirmOpen = false
    @State private var message: String?
    @State private var messageIsError = false

    private var amount: Int { Int(amountText.trimmingCharacters(in: .whitespaces)) ?? 0 }
    private var canAdd: Bool { picked != nil && amount >= 1 && amount <= AdminDashboardViewModel.walletGrantMax && !isSaving }

    var body: some View {
        Form {
            Section {
                TextField("Mobile number, email or name", text: $text)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .submitLabel(.search)
                    .onSubmit { Task { await search() } }
                Button {
                    Task { await search() }
                } label: {
                    HStack {
                        Text("Find the customer")
                        if isSearching { Spacer(); ProgressView() }
                    }
                }
                .disabled(text.trimmingCharacters(in: .whitespaces).count < 2 || isSearching)
            } header: {
                Text("Find a customer")
            } footer: {
                Text("A mobile number works with or without +91. A name has to start the way it is saved.")
            }

            if let results, picked == nil {
                Section("Customers") {
                    if results.isEmpty {
                        Text("No customer found.").foregroundColor(.secondary)
                    }
                    ForEach(results) { hit in
                        Button {
                            Task { await pick(hit) }
                        } label: {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(hit.name.isEmpty ? "No name" : hit.name)
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundColor(.primary)
                                Text([hit.mobile, hit.email].filter { !$0.isEmpty }.joined(separator: " · "))
                                    .font(.system(size: 12))
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }
            }

            if let picked {
                Section {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(picked.name.isEmpty ? "No name" : picked.name)
                            .font(.system(size: 16, weight: .bold))
                        Text([picked.mobile, picked.email].filter { !$0.isEmpty }.joined(separator: " · "))
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                        if let wallet {
                            Text("Added so far: ₹\(wallet.bonus). Spent: ₹\(wallet.used).")
                                .font(.system(size: 12))
                                .foregroundColor(.secondary)
                        }
                    }
                    HStack {
                        Text("Amount to add (₹)")
                        Spacer()
                        TextField("50", text: $amountText)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 90)
                    }
                    TextField("Note (only you see it)", text: $note)
                    Button {
                        isConfirmOpen = true
                    } label: {
                        Label("Add to wallet", systemImage: "plus.circle.fill")
                            .font(.system(size: 16, weight: .semibold))
                    }
                    .disabled(!canAdd)
                    Button("Choose someone else") {
                        self.picked = nil
                        wallet = nil
                    }
                } header: {
                    Text("Add money")
                } footer: {
                    Text("Up to ₹\(AdminDashboardViewModel.walletGrantMax) at once.")
                }
            }

            if let message {
                Section {
                    Text(message)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(messageIsError ? .red : .green)
                }
            }
        }
        .navigationTitle("Add wallet money")
        .navigationBarTitleDisplayMode(.inline)
        .alert(
            "Add ₹\(amount) to \(picked.map { $0.name.isEmpty ? ($0.mobile.isEmpty ? $0.email : $0.mobile) : $0.name } ?? "")'s wallet?",
            isPresented: $isConfirmOpen
        ) {
            Button("Add ₹\(amount)") { Task { await give() } }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("They see it in the app straight away.")
        }
    }

    private func search() async {
        message = nil
        picked = nil
        isSearching = true
        results = await vm.findCustomers(text)
        isSearching = false
    }

    private func pick(_ hit: AdminDashboardViewModel.CustomerHit) async {
        picked = hit
        amountText = ""
        note = ""
        message = nil
        wallet = await vm.readWallet(uid: hit.id)
    }

    private func give() async {
        guard let picked else { return }
        isSaving = true
        defer { isSaving = false }
        if let problem = await vm.giveWalletMoney(to: picked, amount: amount, note: note) {
            message = problem
            messageIsError = true
            return
        }
        wallet = await vm.readWallet(uid: picked.id)
        message = "Done. ₹\(amount) added. They see it in the app now."
        messageIsError = false
        amountText = ""
        note = ""
    }
}
