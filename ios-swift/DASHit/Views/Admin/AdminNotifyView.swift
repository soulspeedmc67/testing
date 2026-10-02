import SwiftUI
import FirebaseAuth

/// "Notify customers": one notification to every shopper with the app, on
/// Android and iPhone (public/api/push/broadcast.php). Write it, see how it
/// will look, confirm, send. The server allows a few a day, so a slip can't
/// flood people's phones.
struct AdminNotifyView: View {
    @State private var title = ""
    @State private var message = ""
    @State private var history: [Broadcast] = []
    @State private var perDay = 10
    @State private var isConfirmOpen = false
    @State private var isSending = false
    @State private var error: String?
    @State private var sentNote: String?

    private static let titleMax = 60
    private static let messageMax = 180
    private static let endpoint = URL(string: "https://dashit.co.in/api/push/broadcast.php")!

    struct Broadcast: Decodable, Hashable {
        let at: Double
        let title: String
        let text: String
        let sent: Bool
    }

    private var sentToday: Int {
        let since = Date().timeIntervalSince1970 - 86400
        return history.filter { $0.sent && $0.at > since }.count
    }
    private var left: Int { max(0, perDay - sentToday) }
    private var trimmedTitle: String { title.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var trimmedMessage: String { message.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var canSend: Bool { !trimmedTitle.isEmpty && !trimmedMessage.isEmpty && left > 0 && !isSending }

    var body: some View {
        Form {
            Section {
                TextField("Fresh apples are in", text: $title)
                    .onChange(of: title) { _, value in
                        if value.count > Self.titleMax { title = String(value.prefix(Self.titleMax)) }
                    }
                TextField("Kashmiri apples at ₹120 a kilo today only.", text: $message, axis: .vertical)
                    .lineLimit(3...5)
                    .onChange(of: message) { _, value in
                        if value.count > Self.messageMax { message = String(value.prefix(Self.messageMax)) }
                    }
            } header: {
                Text("Title and message")
            } footer: {
                Text("\(left) of \(perDay) left today")
            }

            Section("Preview") {
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: "bag.fill")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                        .frame(width: 36, height: 36)
                        .background(AdminStyle.brand, in: RoundedRectangle(cornerRadius: 9, style: .continuous))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(trimmedTitle.isEmpty ? "Title" : trimmedTitle)
                            .font(.system(size: 15, weight: .semibold))
                            .lineLimit(1)
                        Text(trimmedMessage.isEmpty ? "Your message" : trimmedMessage)
                            .font(.system(size: 15))
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.vertical, 4)
            }

            Section {
                Button {
                    isConfirmOpen = true
                } label: {
                    HStack {
                        Spacer()
                        if isSending {
                            ProgressView()
                        } else {
                            Label("Send to all customers", systemImage: "paperplane.fill")
                                .font(.system(size: 17, weight: .bold))
                        }
                        Spacer()
                    }
                }
                .disabled(!canSend)
                if let sentNote {
                    Label(sentNote, systemImage: "checkmark.circle.fill")
                        .foregroundColor(.green)
                }
                if let error {
                    Text(error).foregroundColor(.red)
                }
            }

            if !history.isEmpty {
                Section("Sent recently") {
                    ForEach(history, id: \.self) { item in
                        VStack(alignment: .leading, spacing: 3) {
                            Text(item.title).font(.system(size: 15, weight: .semibold))
                            Text(item.text).font(.system(size: 14)).foregroundColor(.secondary)
                            Text(Date(timeIntervalSince1970: item.at), style: .relative)
                                .font(.system(size: 12))
                                .foregroundColor(.secondary)
                                + Text(item.sent ? " ago" : " ago · didn't go out")
                                .font(.system(size: 12))
                                .foregroundColor(item.sent ? .secondary : .orange)
                        }
                        .padding(.vertical, 2)
                    }
                }
            }
        }
        .confirmationDialog("Send to every customer?", isPresented: $isConfirmOpen, titleVisibility: .visible) {
            Button("Send now") { Task { await send() } }
            Button("Not yet", role: .cancel) {}
        } message: {
            Text("“\(trimmedTitle)” goes to everyone with the DASHit app right away. It can't be taken back.")
        }
        .task { await loadHistory() }
    }

    private func loadHistory() async {
        guard let data = try? await call(["action": "history"]) else { return }
        apply(data)
    }

    private func send() async {
        isSending = true
        error = nil
        sentNote = nil
        defer { isSending = false }
        do {
            let data = try await call(["title": trimmedTitle, "text": trimmedMessage])
            apply(data)
            title = ""
            message = ""
            sentNote = "Sent to all customers"
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        } catch {
            self.error = error.localizedDescription
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
    }

    private struct Reply: Decodable {
        let history: [Broadcast]?
        let perDay: Int?
        let error: String?
    }

    private func apply(_ reply: Reply) {
        if let list = reply.history { history = list }
        if let limit = reply.perDay { perDay = limit }
    }

    private func call(_ fields: [String: String]) async throws -> Reply {
        guard let user = Auth.auth().currentUser else {
            throw NSError(domain: "DASHit", code: 401, userInfo: [NSLocalizedDescriptionKey: "Please sign in again."])
        }
        let idToken = try await user.getIDToken()
        var request = URLRequest(url: Self.endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        var body = fields
        body["id_token"] = idToken
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await URLSession.shared.data(for: request)
        let reply = (try? JSONDecoder().decode(Reply.self, from: data)) ?? Reply(history: nil, perDay: nil, error: nil)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            if let list = reply.history { history = list }
            throw NSError(domain: "DASHit", code: status, userInfo: [NSLocalizedDescriptionKey: reply.error ?? "Couldn't send it just now. Please try again."])
        }
        return reply
    }
}
