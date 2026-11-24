import SwiftUI
import FirebaseAuth

/// "Cart reminders": "Your cart is waiting" to every shopper who left items
/// in their cart (public/api/push/cart-remind.php). Shows how many are
/// waiting, what they'll see, and sends on a confirm. The server only sends
/// in the day, skips anyone reminded in the last 20 hours and allows two
/// sends a day, so a tap too many can't pester anyone.
struct AdminCartRemindView: View {
    @State private var waiting: Int?
    @State private var history: [Send] = []
    @State private var perDay = 2
    @State private var isLoading = false
    @State private var isSending = false
    @State private var isConfirmOpen = false
    @State private var error: String?
    @State private var sentNote: String?

    private static let endpoint = URL(string: "https://dashit.co.in/api/push/cart-remind.php")!

    struct Send: Decodable, Hashable {
        let at: Double
        let sent: Int
        let waiting: Int?
    }

    private var sentToday: Int {
        let since = Date().timeIntervalSince1970 - 86400
        return history.filter { $0.sent > 0 && $0.at > since }.count
    }
    private var left: Int { max(0, perDay - sentToday) }
    private var canSend: Bool { (waiting ?? 0) > 0 && left > 0 && !isSending }

    var body: some View {
        Form {
            Section {
                HStack(spacing: 14) {
                    Image(systemName: "cart.fill.badge.questionmark")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundColor(AdminStyle.brand)
                        .frame(width: 44, height: 44)
                        .background(AdminStyle.brand.opacity(0.12), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    VStack(alignment: .leading, spacing: 2) {
                        if let waiting {
                            Text("\(waiting) shopper\(waiting == 1 ? "" : "s")")
                                .font(.system(size: 22, weight: .bold))
                            Text(waiting == 0 ? "Nobody has a cart waiting right now" : "have items waiting in their cart")
                                .font(.system(size: 14))
                                .foregroundColor(.secondary)
                        } else {
                            Text(isLoading ? "Checking carts…" : "Couldn't check carts")
                                .font(.system(size: 17, weight: .semibold))
                        }
                    }
                    Spacer()
                    if isLoading { ProgressView() }
                }
                .padding(.vertical, 4)
            } footer: {
                Text("Counts shoppers with the app who left their cart for at least 30 minutes in the last week and haven't had a cart reminder in the last 20 hours.")
            }

            Section("What they'll see") {
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: "bag.fill")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                        .frame(width: 36, height: 36)
                        .background(AdminStyle.brand, in: RoundedRectangle(cornerRadius: 9, style: .continuous))
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Your cart is waiting")
                            .font(.system(size: 15, weight: .semibold))
                        Text("You left 3 items in your cart. Order now and get them delivered in minutes.")
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
                            Label("Send cart reminder", systemImage: "paperplane.fill")
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
            } footer: {
                Text("\(left) of \(perDay) left today. Sent only between 9 AM and 9 PM. Shoppers' phones also remind them by themselves 30 minutes after they leave, and shoppers can turn cart reminders off in their profile.")
            }

            if !history.isEmpty {
                Section("Sent recently") {
                    ForEach(history, id: \.self) { item in
                        HStack {
                            Text("\(item.sent) shopper\(item.sent == 1 ? "" : "s")")
                                .font(.system(size: 15, weight: .semibold))
                            Spacer()
                            Text(Date(timeIntervalSince1970: item.at), style: .relative)
                                .font(.system(size: 13))
                                .foregroundColor(.secondary)
                            + Text(" ago").font(.system(size: 13)).foregroundColor(.secondary)
                        }
                    }
                }
            }
        }
        .confirmationDialog("Remind \(waiting ?? 0) shopper\(waiting == 1 ? "" : "s") about their cart?", isPresented: $isConfirmOpen, titleVisibility: .visible) {
            Button("Send now") { Task { await send() } }
            Button("Not yet", role: .cancel) {}
        } message: {
            Text("Each gets one notification right away. It can't be taken back.")
        }
        .refreshable { await load() }
        .task { await load() }
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        if let reply = try? await call("preview") { apply(reply) }
    }

    private func send() async {
        isSending = true
        error = nil
        sentNote = nil
        defer { isSending = false }
        do {
            let reply = try await call("send")
            apply(reply)
            let count = reply.sent ?? 0
            sentNote = count == 0 ? "Nobody to remind right now" : "Sent to \(count) shopper\(count == 1 ? "" : "s")"
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        } catch {
            self.error = error.localizedDescription
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
    }

    private struct Reply: Decodable {
        let waiting: Int?
        let sent: Int?
        let history: [Send]?
        let perDay: Int?
        let error: String?
    }

    private func apply(_ reply: Reply) {
        if let value = reply.waiting { waiting = value }
        if let list = reply.history { history = list }
        if let limit = reply.perDay { perDay = limit }
    }

    private func call(_ action: String) async throws -> Reply {
        guard let user = Auth.auth().currentUser else {
            throw NSError(domain: "DASHit", code: 401, userInfo: [NSLocalizedDescriptionKey: "Please sign in again."])
        }
        let idToken = try await user.getIDToken()
        var request = URLRequest(url: Self.endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["id_token": idToken, "action": action])
        let (data, response) = try await URLSession.shared.data(for: request)
        let reply = (try? JSONDecoder().decode(Reply.self, from: data))
            ?? Reply(waiting: nil, sent: nil, history: nil, perDay: nil, error: nil)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            apply(reply)
            throw NSError(domain: "DASHit", code: status, userInfo: [NSLocalizedDescriptionKey: reply.error ?? "Couldn't send them just now. Please try again."])
        }
        return reply
    }
}
