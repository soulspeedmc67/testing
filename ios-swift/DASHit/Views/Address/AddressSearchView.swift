import SwiftUI
import MapKit

/// A place picked in search, handed to the pin picker to fine-tune.
struct PickedPlace: Hashable {
    let latitude: Double
    let longitude: Double
    /// nil lets the pin picker name the spot itself.
    let line: String?

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    init(_ coordinate: CLLocationCoordinate2D, line: String?) {
        latitude = coordinate.latitude
        longitude = coordinate.longitude
        self.line = line
    }
}

/// Apple Maps suggestions as the shopper types, biased to the hub's area.
@MainActor
final class AddressSearchModel: NSObject, ObservableObject, MKLocalSearchCompleterDelegate {
    @Published var query = "" {
        didSet {
            let trimmed = query.trimmingCharacters(in: .whitespaces)
            if trimmed.isEmpty {
                completions = []
            }
            completer.queryFragment = trimmed
        }
    }
    @Published private(set) var completions: [MKLocalSearchCompletion] = []

    private let completer = MKLocalSearchCompleter()
    private let region = MKCoordinateRegion(center: DeliveryEta.hub, latitudinalMeters: 20_000, longitudinalMeters: 20_000)

    override init() {
        super.init()
        completer.delegate = self
        completer.resultTypes = [.address, .pointOfInterest]
        completer.region = region
    }

    var localities: [AnantnagLocality] {
        AnantnagLocality.matching(query)
    }

    nonisolated func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
        let results = Array(completer.results.prefix(12))
        Task { @MainActor in
            guard !self.query.trimmingCharacters(in: .whitespaces).isEmpty else { return }
            self.completions = results
        }
    }

    nonisolated func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
        Task { @MainActor in
            self.completions = []
        }
    }

    /// The coordinate behind a suggestion; nil when Apple Maps can't place it.
    func resolve(_ completion: MKLocalSearchCompletion) async -> PickedPlace? {
        let request = MKLocalSearch.Request(completion: completion)
        request.region = region
        guard let response = try? await MKLocalSearch(request: request).start(),
              let item = response.mapItems.first else { return nil }
        let line = [completion.title, completion.subtitle].filter { !$0.isEmpty }.joined(separator: ", ")
        return PickedPlace(item.placemark.coordinate, line: line)
    }
}

/// "Add location manually": type a street, area or landmark, pick a match,
/// then fine-tune the pin and add the house number before saving.
struct AddressSearchView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var search = AddressSearchModel()
    @FocusState private var isFieldFocused: Bool
    @State private var picked: PickedPlace?
    @State private var resolvingCompletion: MKLocalSearchCompletion?
    @State private var failedToPlace = false

    private var trimmedQuery: String {
        search.query.trimmingCharacters(in: .whitespaces)
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                field
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
                    .padding(.bottom, 10)

                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 0) {
                        results
                    }
                    .padding(.bottom, 24)
                }
                .scrollDismissesKeyboard(.interactively)
            }
            .background(Color.surface.ignoresSafeArea())
            .navigationTitle("Search address")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.surface, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(.textMuted)
                }
            }
            .navigationDestination(item: $picked) { place in
                AddressPinPicker(start: place.coordinate, startLine: place.line, onSaved: { dismiss() })
            }
            .task {
                // After the sheet has risen, so the keyboard doesn't fight it.
                try? await Task.sleep(for: .milliseconds(350))
                isFieldFocused = true
            }
        }
        .dashitSheet([.large])
    }

    // MARK: - Field

    private var field: some View {
        let shape = RoundedRectangle(cornerRadius: 16, style: .continuous)

        return HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 17, weight: .semibold))
                .foregroundColor(.textMuted)
            TextField("", text: $search.query, prompt: Text("Street, area or landmark").foregroundColor(.textFaint))
                .focused($isFieldFocused)
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(.textPrimary)
                .tint(.brandOrange)
                .submitLabel(.search)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.words)
                .onSubmit(pickFirstResult)
                .accessibilityLabel("Search for an address")
            if !search.query.isEmpty {
                Button {
                    search.query = ""
                    failedToPlace = false
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
        .background(Color.surfaceRaised, in: shape)
        .overlay(shape.strokeBorder(isFieldFocused ? Color.brandOrange.opacity(0.7) : Color.hairline, lineWidth: 1))
        .animation(.dashitSnappy, value: isFieldFocused)
    }

    // MARK: - Results

    @ViewBuilder
    private var results: some View {
        if failedToPlace {
            Label("Couldn't place that one. Try another result, or select it on the map.", systemImage: "exclamationmark.triangle.fill")
                .font(.system(size: 12.5, weight: .medium))
                .foregroundColor(.caution)
                .padding(.horizontal, 16)
                .padding(.bottom, 8)
                .transition(.opacity)
        }

        if trimmedQuery.isEmpty {
            sectionLabel("Popular areas")
            ForEach(AnantnagLocality.all.prefix(8)) { locality in
                localityRow(locality)
            }
        } else {
            let localities = search.localities
            if !localities.isEmpty {
                sectionLabel("Areas we deliver to")
                ForEach(localities) { locality in
                    localityRow(locality)
                }
            }
            if !search.completions.isEmpty {
                sectionLabel("Places")
                ForEach(search.completions, id: \.self) { completion in
                    completionRow(completion)
                }
            }
            if localities.isEmpty && search.completions.isEmpty {
                noResults
            }
        }
    }

    private func sectionLabel(_ title: String) -> some View {
        Text(title.uppercased())
            .font(.system(size: 11, weight: .heavy))
            .tracking(1.2)
            .foregroundColor(.textMuted)
            .padding(.horizontal, 16)
            .padding(.top, 14)
            .padding(.bottom, 6)
    }

    private func localityRow(_ locality: AnantnagLocality) -> some View {
        let quote = DeliveryEta.quote(for: locality.coordinate)
        return resultRow(
            symbol: "mappin.circle.fill",
            title: locality.name,
            subtitle: "Anantnag · \(quote.isDeliverable ? quote.distanceText : "outside our 5 km area")",
            isDimmed: !quote.isDeliverable,
            isLoading: false
        ) {
            picked = PickedPlace(locality.coordinate, line: "\(locality.name), Anantnag")
        }
    }

    private func completionRow(_ completion: MKLocalSearchCompletion) -> some View {
        resultRow(
            symbol: "building.2.crop.circle.fill",
            title: completion.title,
            subtitle: completion.subtitle,
            isDimmed: false,
            isLoading: resolvingCompletion == completion
        ) {
            place(completion)
        }
    }

    private func resultRow(
        symbol: String,
        title: String,
        subtitle: String,
        isDimmed: Bool,
        isLoading: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button {
            HapticsManager.shared.light()
            action()
        } label: {
            HStack(spacing: 12) {
                Image(systemName: symbol)
                    .font(.system(size: 22))
                    .foregroundStyle(Color.brandAccent, Color.brandOrange.opacity(0.14))
                    .symbolRenderingMode(.palette)
                    .frame(width: 32)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.textPrimary)
                        .lineLimit(1)
                    if !subtitle.isEmpty {
                        Text(subtitle)
                            .font(.system(size: 12.5))
                            .foregroundColor(.textMuted)
                            .lineLimit(1)
                    }
                }
                Spacer(minLength: 8)
                if isLoading {
                    ProgressView()
                        .tint(.brandOrange)
                } else {
                    Image(systemName: "arrow.up.left")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.textFaint)
                }
            }
            .opacity(isDimmed ? 0.55 : 1)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .contentShape(Rectangle())
        }
        .buttonStyle(.pressable)
        .disabled(resolvingCompletion != nil)
    }

    private var noResults: some View {
        VStack(spacing: 10) {
            Image(systemName: "map")
                .font(.system(size: 28))
                .foregroundColor(.textFaint)
            Text("No matches for “\(trimmedQuery)”")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.textSecondary)
            Text("Try the area or a landmark near you, or drop a pin instead.")
                .font(.system(size: 13))
                .foregroundColor(.textMuted)
                .multilineTextAlignment(.center)
            Button {
                HapticsManager.shared.light()
                picked = PickedPlace(AddressBook.shared.current?.coordinate ?? DeliveryEta.hub, line: nil)
            } label: {
                Label("Select on map", systemImage: "map.fill")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 18)
                    .frame(height: 42)
                    .background(Color.brandOrange, in: Capsule())
            }
            .buttonStyle(.pressable)
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 24)
        .padding(.top, 40)
    }

    // MARK: - Actions

    private func place(_ completion: MKLocalSearchCompletion) {
        guard resolvingCompletion == nil else { return }
        resolvingCompletion = completion
        withAnimation(.dashitSnappy) { failedToPlace = false }
        Task {
            let place = await search.resolve(completion)
            resolvingCompletion = nil
            if let place {
                picked = place
            } else {
                HapticsManager.shared.warning()
                withAnimation(.dashitSnappy) { failedToPlace = true }
            }
        }
    }

    /// Return picks the best match, as a search field should.
    private func pickFirstResult() {
        if let locality = search.localities.first {
            picked = PickedPlace(locality.coordinate, line: "\(locality.name), Anantnag")
        } else if let completion = search.completions.first {
            place(completion)
        }
    }
}
