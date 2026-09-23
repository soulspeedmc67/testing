import SwiftUI
import MapKit

struct AddressPickerMapView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var cameraPosition: MapCameraPosition = .region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 33.7311, longitude: 75.1487), // Anantnag center
            span: MKCoordinateSpan(latitudeDelta: 0.008, longitudeDelta: 0.008)
        )
    )
    @State private var houseNumber = ""
    @State private var landmark = ""
    @State private var selectedNickname = "Home"
    @State private var reverseGeocodedAddress = "Court Road, Lal Chowk, Anantnag"
    
    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                // Native Apple Map
                Map(position: $cameraPosition) {
                    Annotation("Delivery Pin", coordinate: CLLocationCoordinate2D(latitude: 33.7311, longitude: 75.1487)) {
                        ZStack {
                            Circle()
                                .fill(Color.brandOrange.opacity(0.25))
                                .frame(width: 44, height: 44)
                            Image(systemName: "mappin.circle.fill")
                                .font(.system(size: 32))
                                .foregroundColor(.brandAccent)
                        }
                    }
                }
                .ignoresSafeArea()
                
                // Bottom Form Card
                VStack(spacing: 12) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Select Delivery Location")
                                .font(.dashitTitle)
                                .foregroundColor(.white)
                            Text(reverseGeocodedAddress)
                                .font(.dashitCaption)
                                .foregroundColor(.textMuted)
                        }
                        Spacer()
                    }
                    
                    // Address Details
                    TextField("House / Flat / Floor No.", text: $houseNumber)
                        .font(.dashitBody)
                        .padding(12)
                        .background(Color.surfaceMuted)
                        .cornerRadius(10)
                        .foregroundColor(.white)
                    
                    TextField("Landmark (e.g. Near Degree College)", text: $landmark)
                        .font(.dashitBody)
                        .padding(12)
                        .background(Color.surfaceMuted)
                        .cornerRadius(10)
                        .foregroundColor(.white)
                    
                    // Tag selector (Home, Work, Other)
                    HStack(spacing: 10) {
                        ForEach(["Home", "Work", "Other"], id: \.self) { tag in
                            Button(action: {
                                selectedNickname = tag
                                HapticsManager.shared.selection()
                            }) {
                                Text(tag)
                                    .font(.dashitCaptionBold)
                                    .foregroundColor(selectedNickname == tag ? .white : .textSecondary)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 8)
                                    .background(selectedNickname == tag ? Color.brandOrange : Color.surfaceMuted)
                                    .cornerRadius(8)
                            }
                        }
                        Spacer()
                    }
                    
                    // Save CTA
                    Button(action: {
                        let newAddress = DeliveryAddress(
                            nickname: selectedNickname,
                            street: reverseGeocodedAddress,
                            houseNumber: houseNumber,
                            landmark: landmark,
                            city: "Anantnag",
                            pincode: "192101",
                            latitude: 33.7311,
                            longitude: 75.1487
                        )
                        LocalStorage.shared.saveAddress(newAddress)
                        HapticsManager.shared.success()
                        dismiss()
                    }) {
                        Text("Confirm Delivery Location")
                            .font(.dashitBodyBold)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.brandOrange)
                            .cornerRadius(12)
                    }
                }
                .padding(16)
                .background(Color.surfaceRaised)
                .cornerRadius(20)
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.hairline, lineWidth: 1)
                )
                .padding(.horizontal, 12)
                .padding(.bottom, 12)
            }
            .navigationTitle("Pin Your Address")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(.textMuted)
                }
            }
        }
    }
}
