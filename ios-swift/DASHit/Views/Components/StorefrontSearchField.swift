import SwiftUI

/// Home search field. While empty, the hint cycles through real catalogue items
/// ("Search “amul butter”"), rolling upward like the web AnimatedSearchBar.
struct StorefrontSearchField: View {
    @Binding var text: String
    var isFocused: FocusState<Bool>.Binding

    @State private var hintIndex = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    static let hints = [
        "amul butter",
        "lavas bread",
        "kashmiri cherries",
        "basmati rice",
        "cadbury silk",
        "fresh paneer",
        "green coconut"
    ]

    init(text: Binding<String>, isFocused: FocusState<Bool>.Binding) {
        self._text = text
        self.isFocused = isFocused
    }

    private var fieldShape: RoundedRectangle { RoundedRectangle(cornerRadius: 16, style: .continuous) }

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 17, weight: .semibold))
                .foregroundColor(.textMuted)

            ZStack(alignment: .leading) {
                if text.isEmpty {
                    HStack(spacing: 4) {
                        Text("Search")
                        Text("“\(Self.hints[hintIndex])”")
                            .id(hintIndex)
                            .transition(
                                .asymmetric(
                                    insertion: .move(edge: .bottom).combined(with: .opacity),
                                    removal: .move(edge: .top).combined(with: .opacity)
                                )
                            )
                    }
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(.textFaint)
                    .lineLimit(1)
                    .allowsHitTesting(false)
                    .accessibilityHidden(true)
                }
                TextField("", text: $text)
                    .focused(isFocused)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(.textPrimary)
                    .tint(.brandOrange)
                    .submitLabel(.search)
                    .autocorrectionDisabled()
                    .accessibilityLabel("Search products")
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .clipped()

            if !text.isEmpty {
                Button {
                    text = ""
                    HapticsManager.shared.tick()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 17))
                        .foregroundColor(.textMuted)
                        .frame(width: 32, height: 32)
                        .contentShape(Rectangle())
                }
                .accessibilityLabel("Clear search")
            }
        }
        .padding(.horizontal, 14)
        .frame(height: 50)
        .background(Color.surfaceRaised, in: fieldShape)
        .overlay(
            fieldShape.strokeBorder(
                isFocused.wrappedValue ? Color.brandOrange.opacity(0.7) : Color.hairline,
                lineWidth: 1
            )
        )
        .animation(.dashitSnappy, value: isFocused.wrappedValue)
        .task {
            await rotateHints()
        }
    }

    private func rotateHints() async {
        guard !reduceMotion else { return }
        while !Task.isCancelled {
            try? await Task.sleep(for: .seconds(2.6))
            guard !Task.isCancelled else { return }
            withAnimation(.dashitSpring) {
                hintIndex = (hintIndex + 1) % Self.hints.count
            }
        }
    }
}
