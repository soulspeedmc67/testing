import SwiftUI
import MapKit

/// Where orders are delivered from. The owner picks the spot on the map (or
/// searches, or uses this phone's location), names it and switches the store to
/// it. Every distance, delivery time, delivery-area check, distance charge and
/// rider map on the website and both apps follows the new spot straight away.
/// Places used often ("Home", "Dark store") are saved to switch between with
/// one tap. Same data as the staff console's card of the same name
/// (`storeLat`, `storeLng`, `storeLabel`, `storePresets` on `config/store`).
struct AdminStoreLocationView: View {
    @ObservedObject var vm: AdminDashboardViewModel

    @StateObject private var search = AddressSearchModel()
    @StateObject private var locator = LocationProvider()
    @State private var position: MapCameraPosition = .region(
        MKCoordinateRegion(center: DeliveryEta.hub, latitudinalMeters: 1500, longitudinalMeters: 1500)
    )
    @State private var center: CLLocationCoordinate2D = DeliveryEta.hub
    @State private var name = ""
    @State private var address = ""
    @State private var pending: PendingSwitch?
    @State private var didStart = false

    private struct PendingSwitch: Identifiable {
        let id = UUID()
        let coordinate: CLLocationCoordinate2D
        let name: String
        let farKm: Double
    }

    private var activeCoordinate: CLLocationCoordinate2D { vm.shopRules.storeCoordinate ?? DeliveryEta.defaultHub }
    private var activeName: String {
        let label = vm.shopRules.storeLabel
        if !label.isEmpty { return label }
        return vm.shopRules.storeCoordinate == nil ? "DASHit hub" : "Store"
    }
    private var trimmedName: String { String(name.trimmingCharacters(in: .whitespacesAndNewlines).prefix(40)) }
    private var isActiveSpot: Bool { StoreLocation.km(center, activeCoordinate) < 0.005 }

    var body: some View {
        Form {
            Section {
                HStack(spacing: 10) {
                    Image(systemName: "mappin.circle.fill")
                        .font(.system(size: 22))
                        .foregroundColor(.green)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Now: \(activeName)")
                            .font(.system(size: 15, weight: .bold))
                        Text(String(format: "%.4f, %.4f", activeCoordinate.latitude, activeCoordinate.longitude))
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                            .monospacedDigit()
                    }
                }
            } footer: {
                Text("Orders are delivered from here. The delivery time, the delivery area, the distance charge and the rider's map all follow it.")
            }

            if !vm.storePresets.isEmpty {
                Section("My places") {
                    ForEach(vm.storePresets) { place in
                        presetRow(place)
                    }
                    .onDelete { offsets in
                        var list = vm.storePresets
                        list.remove(atOffsets: offsets)
                        vm.saveStorePresets(list)
                    }
                }
            }

            Section("Pick a new place") {
                TextField("Search a place or area", text: $search.query)
                    .autocorrectionDisabled()
                ForEach(search.completions.prefix(5), id: \.self) { completion in
                    Button {
                        Task {
                            guard let place = await search.resolve(completion) else { return }
                            search.query = ""
                            move(to: place.coordinate)
                        }
                    } label: {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(completion.title).foregroundColor(.primary)
                            if !completion.subtitle.isEmpty {
                                Text(completion.subtitle).font(.system(size: 12)).foregroundColor(.secondary)
                            }
                        }
                    }
                }

                mapPicker
                    .listRowInsets(EdgeInsets())

                if !address.isEmpty {
                    Text(address).font(.system(size: 12)).foregroundColor(.secondary)
                }

                Button {
                    locator.requestCurrentLocation()
                } label: {
                    Label(locator.isLocating ? "Finding you…" : "Use my current location", systemImage: "location.fill")
                }
                if locator.isDenied {
                    Text("Location is off for this app. Turn it on in Settings, or move the pin by hand.")
                        .font(.system(size: 12))
                        .foregroundColor(.orange)
                }
            }

            Section {
                TextField("Home, Dark store, Shop 2…", text: $name)
                Button {
                    askToSwitch(to: center, named: trimmedName)
                } label: {
                    Label(isActiveSpot ? "This is where the store is" : "Deliver from here", systemImage: "scooter")
                        .font(.system(size: 16, weight: .semibold))
                }
                .disabled(isActiveSpot)
                Button {
                    savePreset()
                } label: {
                    Label("Save to my places", systemImage: "plus.circle")
                }
                .disabled(trimmedName.isEmpty || vm.storePresets.count >= StoreLocation.maxPresets)
            } header: {
                Text("Name of this place")
            } footer: {
                Text("Give the spot a name like Home, then switch the store to it, save it to My places, or both. Apps installed before this setting existed keep using the old spot.")
            }
        }
        .navigationTitle("Delivery from")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            guard !didStart else { return }
            didStart = true
            name = vm.shopRules.storeLabel
            center = activeCoordinate
            position = .region(MKCoordinateRegion(center: activeCoordinate, latitudinalMeters: 1500, longitudinalMeters: 1500))
        }
        .onChange(of: locator.lastFix?.latitude) { _, _ in
            if let fix = locator.lastFix { move(to: fix) }
        }
        .task(id: "\(Int(center.latitude * 10_000)),\(Int(center.longitude * 10_000))") {
            try? await Task.sleep(for: .milliseconds(700))
            guard !Task.isCancelled else { return }
            await nameSpot(center)
        }
        .alert(
            "Deliver from \(pending?.name ?? "here")?",
            isPresented: Binding(get: { pending != nil }, set: { if !$0 { pending = nil } }),
            presenting: pending
        ) { request in
            Button("Deliver from here") {
                vm.moveStore(to: request.coordinate, label: request.name == "this place" ? "" : request.name)
                pending = nil
            }
            Button("Cancel", role: .cancel) { pending = nil }
        } message: { request in
            Text("The delivery time, the delivery area and the distance charge for every order will be worked out from there"
                + (request.farKm >= 1 ? String(format: " (%.1f km from where the store is now)", request.farKm) : "")
                + ". The website and both apps follow straight away.")
        }
    }

    // MARK: - Map

    private var mapPicker: some View {
        ZStack {
            Map(position: $position) {
                if (vm.shopRules.deliveryRadiusKm) > 0 {
                    MapCircle(center: activeCoordinate, radius: vm.shopRules.deliveryRadiusKm * 1000)
                        .foregroundStyle(Color.orange.opacity(0.06))
                        .stroke(Color.orange, lineWidth: 1.5)
                }
                Annotation("Store now", coordinate: activeCoordinate) {
                    Image(systemName: "storefront.fill")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.white)
                        .padding(7)
                        .background(Color.green, in: Circle())
                }
            }
            .onMapCameraChange(frequency: .onEnd) { context in
                center = context.region.center
            }

            // The pin: its tip is the centre of the map, which is the picked spot.
            Image(systemName: "mappin")
                .font(.system(size: 34, weight: .bold))
                .foregroundColor(.red)
                .offset(y: -17)
                .allowsHitTesting(false)
        }
        .frame(height: 300)
    }

    private func move(to coordinate: CLLocationCoordinate2D) {
        center = coordinate
        withAnimation(.smooth) {
            position = .region(MKCoordinateRegion(center: coordinate, latitudinalMeters: 1200, longitudinalMeters: 1200))
        }
    }

    private func nameSpot(_ coordinate: CLLocationCoordinate2D) async {
        let location = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
        let marks = try? await CLGeocoder().reverseGeocodeLocation(location)
        guard let mark = marks?.first else {
            address = ""
            return
        }
        address = [mark.name, mark.subLocality, mark.locality].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: ", ")
    }

    // MARK: - Saved places

    private func presetRow(_ place: StorePreset) -> some View {
        let isHere = StoreLocation.km(place.coordinate, activeCoordinate) < 0.005
        return HStack(spacing: 10) {
            Image(systemName: place.name.lowercased().contains("home") ? "house.fill" : "storefront.fill")
                .foregroundColor(.secondary)
                .frame(width: 24)
            VStack(alignment: .leading, spacing: 2) {
                Text(place.name).font(.system(size: 15, weight: .semibold))
                Text(place.address.isEmpty ? String(format: "%.4f, %.4f", place.latitude, place.longitude) : place.address)
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }
            Spacer()
            if isHere {
                Label("In use", systemImage: "checkmark")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.green)
            } else {
                Button("Use") {
                    askToSwitch(to: place.coordinate, named: place.name)
                }
                .buttonStyle(.borderedProminent)
                .tint(.orange)
            }
        }
    }

    private func askToSwitch(to coordinate: CLLocationCoordinate2D, named: String) {
        guard StoreLocation.km(coordinate, activeCoordinate) > 0.005 else { return }
        pending = PendingSwitch(
            coordinate: coordinate,
            name: named.isEmpty ? "this place" : named,
            farKm: StoreLocation.km(coordinate, activeCoordinate)
        )
    }

    private func savePreset() {
        guard !trimmedName.isEmpty else { return }
        var list = vm.storePresets
        if let index = list.firstIndex(where: { $0.name.lowercased() == trimmedName.lowercased() }) {
            list[index].latitude = center.latitude
            list[index].longitude = center.longitude
            list[index].address = address
        } else {
            list.append(StorePreset(name: trimmedName, address: address, latitude: center.latitude, longitude: center.longitude))
        }
        vm.saveStorePresets(list)
    }
}
