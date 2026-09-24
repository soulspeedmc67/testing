import SwiftUI
import MapKit
import Combine

/// The pin picker as its own sheet, with Cancel.
struct AddressPickerMapView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            AddressPinPicker(onSaved: { dismiss() })
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button("Cancel") { dismiss() }
                            .foregroundColor(.textMuted)
                    }
                }
        }
    }
}

/// Drop-a-pin address picker. The pin stays fixed in the middle of the map and
/// the map moves under it; when the map settles, the spot is reverse-geocoded
/// and checked against the 5 km delivery radius, so the saved address carries
/// the real coordinates the rider navigates to. Pushed from address search
/// with the place picked there, or opened on the current address.
struct AddressPinPicker: View {
    var onSaved: () -> Void

    @StateObject private var locator = LocationProvider()

    @State private var cameraPosition: MapCameraPosition
    @State private var pinCoordinate: CLLocationCoordinate2D
    @State private var isMoving = false
    @State private var addressLine = ""
    @State private var isResolving = false
    @State private var geocodeTask: Task<Void, Never>?

    @State private var houseNumber: String
    @State private var landmark: String
    @State private var selectedNickname: String

    /// With `start`, a new address at that place; without, the current one.
    init(start: CLLocationCoordinate2D? = nil, startLine: String? = nil, onSaved: @escaping () -> Void) {
        self.onSaved = onSaved
        let saved = start == nil ? LocalStorage.shared.loadAddress() : nil
        let origin = start ?? saved?.coordinate ?? DeliveryEta.hub
        _pinCoordinate = State(initialValue: origin)
        _cameraPosition = State(initialValue: .region(
            MKCoordinateRegion(center: origin, span: MKCoordinateSpan(latitudeDelta: 0.006, longitudeDelta: 0.006))
        ))
        _addressLine = State(initialValue: startLine ?? saved?.street ?? "")
        _houseNumber = State(initialValue: saved?.houseNumber ?? "")
        _landmark = State(initialValue: saved?.landmark ?? "")
        let known = LocalStorage.shared.loadAddressBook() + [LocalStorage.shared.loadAddress()].compactMap { $0 }
        let hasHome = known.contains { $0.nickname == "Home" }
        _selectedNickname = State(initialValue: saved?.nickname ?? (start != nil && hasHome ? "Other" : "Home"))
    }

    private var quote: DeliveryEta.Quote { DeliveryEta.quote(for: pinCoordinate) }

    var body: some View {
        VStack(spacing: 0) {
            map
            form
        }
        .background(Color.surface.ignoresSafeArea())
        .navigationTitle("Pin your address")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Color.surface, for: .navigationBar)
        .onAppear {
            if addressLine.isEmpty {
                resolveAddress(for: pinCoordinate)
            }
        }
        .onReceive(locator.$lastFix.compactMap { $0 }) { coordinate in
            withAnimation(.dashitSpring) {
                cameraPosition = .region(
                    MKCoordinateRegion(center: coordinate, span: MKCoordinateSpan(latitudeDelta: 0.004, longitudeDelta: 0.004))
                )
            }
        }
    }

    // MARK: - Map with the fixed centre pin

    private var map: some View {
        Map(position: $cameraPosition) {
            UserAnnotation()
            Annotation("DASHit hub", coordinate: DeliveryEta.hub) {
                BrandMapMarker(size: 28)
            }
        }
        .mapControls {
            MapCompass()
        }
        .onMapCameraChange(frequency: .continuous) { _ in
            if !isMoving {
                withAnimation(.dashitSnappy) { isMoving = true }
            }
        }
        .onMapCameraChange(frequency: .onEnd) { context in
            withAnimation(.dashitSpring) { isMoving = false }
            let center = context.region.center
            // The first settle lands where the picker opened; keep the name
            // already known for that spot rather than re-geocoding it.
            let hasMoved = DeliveryEta.haversineKm(from: pinCoordinate, to: center) > 0.005
            pinCoordinate = center
            if hasMoved || addressLine.isEmpty {
                resolveAddress(for: center)
            }
        }
        .overlay {
            centrePin
                .allowsHitTesting(false)
        }
        .overlay(alignment: .bottomTrailing) {
            Button {
                HapticsManager.shared.light()
                locator.requestCurrentLocation()
            } label: {
                Group {
                    if locator.isLocating {
                        ProgressView()
                    } else {
                        Image(systemName: "location.fill")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.brandAccent)
                    }
                }
                .frame(width: 44, height: 44)
                .background(Color.surfaceRaised, in: Circle())
                .overlay(Circle().strokeBorder(Color.hairline, lineWidth: 1))
                .shadow(color: .floatingShadow, radius: 10, x: 0, y: 4)
            }
            .buttonStyle(PressableButtonStyle(scale: 0.9))
            .padding(14)
            .accessibilityLabel("Use my current location")
        }
    }

    /// Lifts while the map moves and drops back when it settles.
    private var centrePin: some View {
        VStack(spacing: 0) {
            ZStack {
                Circle()
                    .fill(Color.brandOrange)
                    .frame(width: 34, height: 34)
                Circle()
                    .fill(Color.white)
                    .frame(width: 12, height: 12)
            }
            Rectangle()
                .fill(Color.brandOrange)
                .frame(width: 3, height: 16)
        }
        .shadow(color: .black.opacity(0.25), radius: 4, x: 0, y: 2)
        .offset(y: isMoving ? -14 : 0)
        // Tip of the needle on the map centre.
        .padding(.bottom, 50)
        .overlay(alignment: .bottom) {
            Ellipse()
                .fill(Color.black.opacity(isMoving ? 0.12 : 0.28))
                .frame(width: isMoving ? 10 : 14, height: 5)
                .padding(.bottom, 48)
        }
    }

    // MARK: - Form

    private var form: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: "mappin.and.ellipse")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.brandAccent)
                    .padding(.top, 2)
                VStack(alignment: .leading, spacing: 3) {
                    Text(isMoving || isResolving ? "Locating…" : (addressLine.isEmpty ? "Move the map to your door" : addressLine))
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.textPrimary)
                        .lineLimit(2)
                    serviceability
                }
                Spacer(minLength: 0)
            }

            if locator.isDenied {
                Text("Location access is off. Allow it in Settings, or move the map to your door.")
                    .font(.system(size: 12))
                    .foregroundColor(.textMuted)
            }

            field("House / flat / floor", text: $houseNumber)
            field("Landmark (e.g. near Degree College)", text: $landmark)

            HStack(spacing: 8) {
                ForEach(["Home", "Work", "Other"], id: \.self) { tag in
                    let isSelected = selectedNickname == tag
                    Button {
                        selectedNickname = tag
                        HapticsManager.shared.selection()
                    } label: {
                        Text(tag)
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(isSelected ? .white : .textSecondary)
                            .padding(.horizontal, 16)
                            .frame(height: 34)
                            .background(isSelected ? Color.brandOrange : Color.surfaceMuted, in: Capsule())
                    }
                    .buttonStyle(.pressable)
                }
                Spacer()
            }

            Button(action: save) {
                Text(quote.isDeliverable ? "Confirm location" : "Outside our delivery area")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(canSave ? .white : .textFaint)
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(canSave ? Color.brandOrange : Color.surfaceMuted, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            .buttonStyle(.pressable)
            .disabled(!canSave)
        }
        .padding(16)
        .background(Color.surface)
        .animation(.dashitSpring, value: quote)
    }

    @ViewBuilder
    private var serviceability: some View {
        if isMoving {
            Text(" ")
                .font(.system(size: 12))
        } else if quote.isDeliverable, let eta = quote.etaMinutes {
            Text("Delivery in \(eta) minutes · \(quote.distanceText)")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.positive)
        } else {
            Text("\(quote.distanceText) from our hub — we deliver within 5 km")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.danger)
        }
    }

    private func field(_ placeholder: String, text: Binding<String>) -> some View {
        TextField("", text: text, prompt: Text(placeholder).foregroundColor(.textFaint))
            .font(.system(size: 15))
            .foregroundColor(.textPrimary)
            .tint(.brandOrange)
            .padding(.horizontal, 12)
            .frame(height: 46)
            .background(Color.surfaceMuted, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var canSave: Bool {
        quote.isDeliverable && !isMoving && !isResolving
    }

    // MARK: - Actions

    private func resolveAddress(for coordinate: CLLocationCoordinate2D) {
        geocodeTask?.cancel()
        isResolving = true
        geocodeTask = Task {
            // Settle first so a flick across town geocodes once, not per frame.
            try? await Task.sleep(for: .milliseconds(250))
            guard !Task.isCancelled else { return }
            let location = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
            let placemark = try? await CLGeocoder().reverseGeocodeLocation(location).first
            guard !Task.isCancelled else { return }
            let parts = [
                [placemark?.subThoroughfare, placemark?.thoroughfare].compactMap { $0 }.joined(separator: " "),
                placemark?.subLocality ?? "",
                placemark?.locality ?? ""
            ]
            let line = parts.filter { !$0.isEmpty }.joined(separator: ", ")
            addressLine = line.isEmpty ? placemark?.name ?? "Pinned location" : line
            isResolving = false
        }
    }

    private func save() {
        guard canSave else { return }
        let address = DeliveryAddress(
            nickname: selectedNickname,
            street: addressLine,
            houseNumber: houseNumber.isEmpty ? nil : houseNumber,
            landmark: landmark.isEmpty ? nil : landmark,
            city: "Anantnag",
            pincode: "192101",
            latitude: pinCoordinate.latitude,
            longitude: pinCoordinate.longitude
        )
        AddressBook.shared.use(address)
        HapticsManager.shared.success()
        onSaved()
    }
}
