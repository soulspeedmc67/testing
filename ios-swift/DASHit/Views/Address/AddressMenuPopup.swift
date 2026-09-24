import SwiftUI

/// Where the address row sits on screen, for the address menu to grow from.
/// A plain reference, so tracking it while the feed scrolls redraws nothing.
final class ScreenAnchor {
    var rect: CGRect = .zero
}

/// The "Deliver to" menu that grows out of the header's address row: search
/// for an address, select one on the map, or switch to a saved address.
struct AddressMenuPopup: View {
    /// The address row's frame in window coordinates.
    let anchor: CGRect
    var onSearch: () -> Void
    var onPickOnMap: () -> Void
    var onDismiss: () -> Void

    @ObservedObject private var book = AddressBook.shared
    @State private var isShown = false

    private static let margin: CGFloat = 16
    private static let maxWidth: CGFloat = 400
    /// Saved rows shown before the list scrolls.
    private static let visibleRows = 4
    private static let rowHeight: CGFloat = 66
    /// The card above the saved list: title, action tiles and section label.
    private static let chromeHeight: CGFloat = 200

    private var cardShape: RoundedRectangle { RoundedRectangle(cornerRadius: 26, style: .continuous) }

    var body: some View {
        GeometryReader { geo in
            let width = min(geo.size.width - Self.margin * 2, Self.maxWidth)
            // Just under the row; near the top if the row has scrolled away.
            let top = anchor.maxY > 0 ? anchor.maxY + 8 : max(geo.safeAreaInsets.top, 44) + 60
            // Grow from the row's pin rather than the card's corner.
            let origin = UnitPoint(x: min(max((anchor.minX + 8 - Self.margin) / width, 0), 1), y: 0)
            // What's left for saved rows under the title and the two tiles.
            let listRoom = geo.size.height - top - Self.chromeHeight - 40

            ZStack(alignment: .topLeading) {
                Color.black
                    .opacity(isShown ? 0.45 : 0)
                    .ignoresSafeArea()
                    .onTapGesture { close() }
                    .accessibilityLabel("Close")
                    .accessibilityAddTraits(.isButton)

                card(listRoom: listRoom)
                    .frame(width: width)
                    .scaleEffect(isShown ? 1 : 0.2, anchor: origin)
                    .opacity(isShown ? 1 : 0)
                    .offset(x: Self.margin, y: top)
                    .accessibilityAddTraits(.isModal)
            }
            .frame(width: geo.size.width, height: geo.size.height, alignment: .topLeading)
        }
        .ignoresSafeArea()
        .onAppear {
            HapticsManager.shared.light()
            withAnimation(.spring(response: 0.42, dampingFraction: 0.82)) {
                isShown = true
            }
        }
        .task {
            await book.importPastOrders(uid: AuthService.shared.firebaseUID)
        }
    }

    // MARK: - Card

    private func card(listRoom: CGFloat) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Deliver to")
                    .font(.system(size: 19, weight: .heavy))
                    .foregroundColor(.textPrimary)
                Spacer()
                Button { close() } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.textSecondary)
                        .frame(width: 28, height: 28)
                        .background(Color.surfaceMuted, in: Circle())
                        .frame(width: 40, height: 40)
                        .contentShape(Circle())
                }
                .buttonStyle(PressableButtonStyle(scale: 0.85))
                .padding(.trailing, -8)
                .accessibilityLabel("Close")
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
            .padding(.bottom, 6)
            .staggered(0, isShown: isShown)

            HStack(spacing: 10) {
                actionTile(
                    symbol: "magnifyingglass",
                    title: "Search address",
                    subtitle: "Type a street or landmark"
                ) {
                    close(then: onSearch)
                }
                actionTile(
                    symbol: "map.fill",
                    title: "Select on map",
                    subtitle: "Drop a pin at your door"
                ) {
                    close(then: onPickOnMap)
                }
            }
            .padding(.horizontal, 12)
            .staggered(1, isShown: isShown)

            Text("SAVED ADDRESSES")
                .font(.system(size: 11, weight: .heavy))
                .tracking(1.2)
                .foregroundColor(.textMuted)
                .padding(.horizontal, 16)
                .padding(.top, 18)
                .padding(.bottom, 4)
                .staggered(2, isShown: isShown)

            savedList(room: listRoom)
                .staggered(3, isShown: isShown)
        }
        .padding(.bottom, 10)
        .background(Color.surfaceOverlay, in: cardShape)
        .overlay(
            cardShape.strokeBorder(
                LinearGradient(colors: [Color.edgeHighlight, Color.hairline], startPoint: .top, endPoint: .bottom),
                lineWidth: 1
            )
        )
        .shadow(color: .floatingShadow, radius: 30, x: 0, y: 16)
    }

    private func actionTile(symbol: String, title: String, subtitle: String, action: @escaping () -> Void) -> some View {
        Button {
            HapticsManager.shared.light()
            action()
        } label: {
            VStack(alignment: .leading, spacing: 10) {
                Image(systemName: symbol)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.brandAccent)
                    .frame(width: 36, height: 36)
                    .background(Color.brandOrange.opacity(0.13), in: Circle())
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.textPrimary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.85)
                    Text(subtitle)
                        .font(.system(size: 11.5, weight: .medium))
                        .foregroundColor(.textMuted)
                        .lineLimit(1)
                        .minimumScaleFactor(0.85)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .background(Color.surfaceMuted, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .contentShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
        .buttonStyle(PressableButtonStyle(scale: 0.95))
    }

    // MARK: - Saved addresses

    /// Up to four rows as they are; more scroll, with half a row peeking out
    /// so it reads as a list that scrolls. Short screens get fewer.
    @ViewBuilder
    private func savedList(room: CGFloat) -> some View {
        let listHeight = max(min(room, Self.rowHeight * (CGFloat(Self.visibleRows) + 0.5)), Self.rowHeight * 1.5)
        if book.saved.isEmpty {
            HStack(spacing: 10) {
                Image(systemName: "bookmark")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.textFaint)
                Text("Addresses you confirm are kept here for next time.")
                    .font(.system(size: 13))
                    .foregroundColor(.textMuted)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        } else if Self.rowHeight * CGFloat(book.saved.count) <= listHeight {
            VStack(spacing: 0) {
                savedRows
            }
        } else {
            ScrollView {
                VStack(spacing: 0) {
                    savedRows
                }
            }
            .scrollIndicators(.visible)
            .frame(height: listHeight)
        }
    }

    private var savedRows: some View {
        ForEach(book.saved) { address in
            savedRow(address)
        }
    }

    private func savedRow(_ address: DeliveryAddress) -> some View {
        let quote = DeliveryEta.quote(for: address.coordinate)
        let isCurrent = book.isCurrent(address)

        return Button {
            HapticsManager.shared.success()
            book.use(address)
            close()
        } label: {
            HStack(spacing: 12) {
                Image(systemName: symbol(for: address.nickname))
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(isCurrent ? .white : .textSecondary)
                    .frame(width: 38, height: 38)
                    .background(isCurrent ? Color.brandOrange : Color.surfaceMuted, in: Circle())
                VStack(alignment: .leading, spacing: 2) {
                    Text(address.nickname)
                        .font(.system(size: 14.5, weight: .bold))
                        .foregroundColor(.textPrimary)
                        .lineLimit(1)
                    Text(address.formattedSummary.isEmpty ? "Pinned location" : address.formattedSummary)
                        .font(.system(size: 12.5))
                        .foregroundColor(.textSecondary)
                        .lineLimit(1)
                    Group {
                        if let eta = quote.etaMinutes {
                            Text("\(eta) min · \(quote.shortDistanceText)")
                                .foregroundColor(.textMuted)
                        } else {
                            Text("Outside our delivery area")
                                .foregroundColor(.danger)
                        }
                    }
                    .font(.system(size: 11.5, weight: .medium))
                }
                Spacer(minLength: 8)
                if isCurrent {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundColor(.brandAccent)
                        .transition(.scale.combined(with: .opacity))
                }
            }
            .padding(.horizontal, 16)
            .frame(height: Self.rowHeight)
            .contentShape(Rectangle())
        }
        .buttonStyle(.pressable)
        .contextMenu {
            Button(role: .destructive) {
                book.remove(address)
            } label: {
                Label("Remove address", systemImage: "trash")
            }
        }
        .accessibilityLabel("\(address.nickname), \(address.formattedSummary)")
        .accessibilityAddTraits(isCurrent ? .isSelected : [])
    }

    private func symbol(for nickname: String) -> String {
        switch nickname.lowercased() {
        case "home": return "house.fill"
        case "work": return "briefcase.fill"
        default: return "mappin.and.ellipse"
        }
    }

    // MARK: - Dismissal

    /// Shrinks back into the row, then leaves; `then` runs straight away so a
    /// sheet can rise while the menu folds away.
    private func close(then action: (() -> Void)? = nil) {
        action?()
        withAnimation(.spring(response: 0.3, dampingFraction: 0.9)) {
            isShown = false
        } completion: {
            onDismiss()
        }
    }
}

private extension View {
    /// Rows settle in one after another as the menu opens.
    func staggered(_ index: Int, isShown: Bool) -> some View {
        opacity(isShown ? 1 : 0)
            .offset(y: isShown ? 0 : 10)
            .animation(.spring(response: 0.4, dampingFraction: 0.85).delay(isShown ? 0.04 * Double(index) + 0.05 : 0), value: isShown)
    }
}
