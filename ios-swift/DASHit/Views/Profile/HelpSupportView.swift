import SwiftUI
import SafariServices

/// How to reach the store, and the pages every screen links to. Same numbers
/// and addresses as the web footer and Terms (`src/pages/terms.js`).
enum SupportContact {
    // No phone number: the owner doesn't take support calls, only messages.
    static let whatsAppURL = URL(string: "https://wa.me/916006990032?text=Hi%20DASHit%2C%20I%20need%20help%20with%20my%20order")!
    static let email = "support@dashit.co.in"
    static let emailURL = URL(string: "mailto:support@dashit.co.in?subject=DASHit%20app%20help")!
    static let privacyURL = URL(string: "https://dashit.co.in/privacy/")!
    static let termsURL = URL(string: "https://dashit.co.in/terms/")!
    static let complaintsURL = URL(string: "https://dashit.co.in/complaints/")!
}

/// A web page shown in Safari's in-app browser, so the shopper never leaves DASHit.
struct SafariView: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> SFSafariViewController {
        let controller = SFSafariViewController(url: url)
        controller.preferredControlTintColor = UIColor(hex: 0xFF5B00)
        controller.dismissButtonStyle = .close
        return controller
    }

    func updateUIViewController(_ controller: SFSafariViewController, context: Context) {}
}

/// A page opened from a row: Privacy Policy, Terms & Conditions or Complaints.
struct LegalPage: Identifiable {
    let title: String
    let url: URL
    var id: String { title }

    static let privacy = LegalPage(title: "Privacy Policy", url: SupportContact.privacyURL)
    static let terms = LegalPage(title: "Terms & Conditions", url: SupportContact.termsURL)
    static let complaints = LegalPage(title: "Complaints & Copyright", url: SupportContact.complaintsURL)
}

/// Help & support: call, WhatsApp or email the store, and answers to the
/// questions shoppers ask most. Answers follow the app's real rules (5 km
/// area, 30-second change window, delivery code) and the Terms.
struct HelpSupportView: View {
    @Environment(\.openURL) private var openURL
    @State private var expandedQuestion: String? = nil
    @State private var legalPage: LegalPage? = nil

    private struct Question: Identifiable {
        let question: String
        let answer: String
        var id: String { question }
    }

    // Static: a stored `private let` would make this view's initializer private.
    private static let questions: [Question] = [
        Question(
            question: "Where do you deliver?",
            answer: "Anywhere within 8 km of our store in Anantnag. Set your address at the top of the Home screen and we'll tell you straight away if we can reach you."
        ),
        Question(
            question: "How long will my order take?",
            answer: "The time on the Home screen is worked out from how far you are from our store. It's an estimate, and it can be longer in heavy traffic, snow or bad weather."
        ),
        Question(
            question: "Can I change or cancel my order?",
            answer: "For 30 seconds after you place it, you can add items or cancel from the order tracker. After that, message us on WhatsApp: an order can still be cancelled until it leaves with the rider."
        ),
        Question(
            question: "What is the delivery code?",
            answer: "Every order has a 4-digit code on its tracker. Share it with your rider at the door; they need it to hand the order over, so it only reaches you."
        ),
        Question(
            question: "Is there a delivery fee?",
            answer: "Delivery is free on your first 5 orders. "
                + "After that, under ₹180 it's 40% of your cart total. Orders from ₹180–₹299 carry a flat ₹35 fee. "
                + "Above ₹299 it's only ₹25. Plus a handling charge on every order, which may vary with weather and unforeseen conditions."
        ),
        Question(
            question: "Something is missing, damaged or wrong",
            answer: "Tell us within 2 hours of delivery on WhatsApp or by email, and we'll replace it or refund it."
        ),
        Question(
            question: "How do I delete my account?",
            answer: "Open Profile and tap Delete account at the bottom. Your profile, saved addresses and personal details are erased."
        ),
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                header

                VStack(spacing: 10) {
                    contactRow(
                        symbol: "message.fill",
                        tint: Color(hex: 0x25D366),
                        title: "Chat on WhatsApp",
                        subtitle: "Usually the quickest",
                        url: SupportContact.whatsAppURL
                    )
                    contactRow(
                        symbol: "envelope.fill",
                        tint: .brandAccent,
                        title: "Email us",
                        subtitle: SupportContact.email,
                        url: SupportContact.emailURL
                    )
                }

                VStack(alignment: .leading, spacing: 10) {
                    Text("Common questions")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(.textPrimary)
                        .padding(.horizontal, 4)

                    VStack(spacing: 0) {
                        ForEach(Array(Self.questions.enumerated()), id: \.element.id) { index, item in
                            if index > 0 {
                                Rectangle().fill(Color.hairline).frame(height: 1)
                            }
                            questionRow(item)
                        }
                    }
                    .dashitCard(cornerRadius: 16)
                }

                HStack(spacing: 16) {
                    Button("Privacy Policy") { legalPage = .privacy }
                    Button("Terms & Conditions") { legalPage = .terms }
                    Button("Complaints") { legalPage = .complaints }
                }
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.textMuted)
                .frame(maxWidth: .infinity)
                .padding(.top, 4)
            }
            .padding(16)
            .padding(.bottom, 24)
        }
        .background(Color.surface.ignoresSafeArea())
        .navigationTitle("Help & support")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Color.surface, for: .navigationBar)
        .sheet(item: $legalPage) { page in
            SafariView(url: page.url)
                .ignoresSafeArea()
        }
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 6) {
                Text("How can we help?")
                    .font(.system(size: 22, weight: .heavy))
                    .foregroundColor(.white)
                Text("Our Anantnag team answers messages while the store is open.")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(Color.white.opacity(0.75))
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
            Image("AuthGroceries")
                .resizable()
                .scaledToFit()
                .frame(height: 104)
                .accessibilityHidden(true)
        }
        .padding(.leading, 18)
        .padding(.trailing, 10)
        .padding(.vertical, 12)
        .background(Color.midnight, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }

    private func contactRow(symbol: String, tint: Color, title: String, subtitle: String, url: URL) -> some View {
        Button {
            HapticsManager.shared.light()
            openURL(url)
        } label: {
            HStack(spacing: 14) {
                Image(systemName: symbol)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(width: 40, height: 40)
                    .background(tint, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.textPrimary)
                    Text(subtitle)
                        .font(.system(size: 13))
                        .foregroundColor(.textMuted)
                }
                Spacer()
                Image(systemName: "arrow.up.right")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.textFaint)
            }
            .padding(12)
            .contentShape(Rectangle())
            .dashitCard(cornerRadius: 16)
        }
        .buttonStyle(.pressable)
    }

    private func questionRow(_ item: Question) -> some View {
        let isOpen = expandedQuestion == item.id

        return Button {
            HapticsManager.shared.selection()
            withAnimation(.dashitSpring) {
                expandedQuestion = isOpen ? nil : item.id
            }
        } label: {
            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .top, spacing: 10) {
                    Text(item.question)
                        .font(.system(size: 14.5, weight: .semibold))
                        .foregroundColor(.textPrimary)
                        .multilineTextAlignment(.leading)
                    Spacer(minLength: 8)
                    Image(systemName: "chevron.down")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.textFaint)
                        .rotationEffect(.degrees(isOpen ? 180 : 0))
                        .padding(.top, 3)
                }
                if isOpen {
                    Text(item.answer)
                        .font(.system(size: 13.5))
                        .foregroundColor(.textSecondary)
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                        .transition(.opacity.combined(with: .move(edge: .top)))
                }
            }
            .padding(14)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityHint(isOpen ? "Hides the answer" : "Shows the answer")
    }
}
