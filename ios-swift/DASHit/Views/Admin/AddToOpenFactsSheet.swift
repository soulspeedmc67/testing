#if ADMIN_APP_TARGET
import PhotosUI
import SwiftUI
import UIKit

/// "Add to Open Food Facts": a photo of the pack's front, its details when the
/// database doesn't have it yet, and the owner's account. The photo goes to the
/// public database, and DASHit keeps only the link to it.
struct AddToOpenFactsSheet: View {
    let barcode: String
    /// Where the database already has this pack, or nil to add it.
    let existingSite: String?
    var onAdded: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var name: String
    @State private var brand: String
    @State private var unit: String
    @State private var kind: OpenFactsUpload.Kind
    @State private var photo: UIImage?
    @State private var pickerItem: PhotosPickerItem?
    @State private var isCameraOpen = false
    @State private var savedLogin: OpenFactsAccount.Login?
    @State private var username = ""
    @State private var password = ""
    @State private var isWorking = false
    @State private var errorText: String?

    init(barcode: String, existingSite: String?, name: String, brand: String, unit: String, category: String, onAdded: @escaping (String) -> Void) {
        self.barcode = barcode
        self.existingSite = existingSite
        self.onAdded = onAdded
        _name = State(initialValue: name)
        _brand = State(initialValue: brand)
        _unit = State(initialValue: unit)
        _kind = State(initialValue: OpenFactsUpload.Kind.guess(forCategory: category))
    }

    private func clean(_ text: String) -> String { text.trimmingCharacters(in: .whitespacesAndNewlines) }

    private var canAdd: Bool {
        photo != nil
            && (existingSite != nil || !clean(name).isEmpty)
            && (savedLogin != nil || (!clean(username).isEmpty && !password.isEmpty))
            && !isWorking
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    if let photo {
                        Image(uiImage: photo)
                            .resizable()
                            .scaledToFit()
                            .frame(maxWidth: .infinity, maxHeight: 220)
                    }
                    if UIImagePickerController.isSourceTypeAvailable(.camera) {
                        Button {
                            isCameraOpen = true
                        } label: {
                            Label(photo == nil ? "Take a photo" : "Take it again", systemImage: "camera")
                        }
                    }
                    PhotosPicker(selection: $pickerItem, matching: .images) {
                        Label("Choose from Photos", systemImage: "photo.on.rectangle")
                    }
                } header: {
                    Text("Front of the pack")
                } footer: {
                    Text("The whole front, straight on, in good light. Only photos you took yourself.")
                }

                Section("About the pack") {
                    LabeledContent("Barcode", value: barcode)
                    if existingSite == nil {
                        TextField("Name, e.g. Maggi 2-Minute Noodles", text: $name)
                        TextField("Brand", text: $brand)
                        TextField("Pack size, e.g. 70 g", text: $unit)
                        Picker("What it is", selection: $kind) {
                            ForEach(OpenFactsUpload.Kind.allCases) { option in
                                Text(option.title).tag(option)
                            }
                        }
                    } else {
                        Text("Open Food Facts already has this pack, so only the photo is added.")
                            .font(.system(size: 14))
                            .foregroundColor(.secondary)
                    }
                }

                Section {
                    if let savedLogin {
                        LabeledContent("Signed in as", value: savedLogin.username)
                        Button("Use a different account", role: .destructive) {
                            OpenFactsAccount.forget()
                            self.savedLogin = nil
                        }
                    } else {
                        TextField("Username (not your email)", text: $username)
                            .textContentType(.username)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                        SecureField("Password", text: $password)
                            .textContentType(.password)
                        if let signUp = URL(string: "https://world.openfoodfacts.org/cgi/user.pl") {
                            Link("Make a free account", destination: signUp)
                        }
                    }
                } header: {
                    Text("Your Open Food Facts account")
                } footer: {
                    Text("Kept on this iPhone only. What you add is public on Open Food Facts and free for anyone to use (CC BY-SA).")
                }

                if let errorText {
                    Section {
                        Text(errorText)
                            .foregroundColor(.red)
                    }
                }
            }
            .navigationTitle("Add to Open Food Facts")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .disabled(isWorking)
                }
                ToolbarItem(placement: .confirmationAction) {
                    if isWorking {
                        ProgressView()
                    } else {
                        Button("Add") { add() }
                            .font(.system(size: 17, weight: .bold))
                            .disabled(!canAdd)
                    }
                }
            }
            .interactiveDismissDisabled(isWorking)
            .fullScreenCover(isPresented: $isCameraOpen) {
                CameraCapture(onImage: { photo = $0 }, onClose: { isCameraOpen = false })
                    .ignoresSafeArea()
            }
            .onChange(of: pickerItem) { _, item in
                loadPicked(item)
            }
            .onAppear {
                savedLogin = OpenFactsAccount.saved()
            }
        }
    }

    private func loadPicked(_ item: PhotosPickerItem?) {
        guard let item else { return }
        Task {
            if let data = try? await item.loadTransferable(type: Data.self), let image = UIImage(data: data) {
                photo = image
            }
            pickerItem = nil
        }
    }

    private func add() {
        guard let photo else { return }
        let login = savedLogin ?? OpenFactsAccount.Login(username: clean(username), password: password)
        isWorking = true
        errorText = nil
        Task {
            defer { isWorking = false }
            do {
                let link = try await OpenFactsUpload.add(
                    barcode: barcode,
                    site: existingSite,
                    kind: kind,
                    name: clean(name),
                    brand: clean(brand),
                    quantity: clean(unit),
                    photo: photo,
                    login: login
                )
                // Remembered only once it has worked, so a mistyped password isn't kept.
                if savedLogin == nil { OpenFactsAccount.save(login) }
                UINotificationFeedbackGenerator().notificationOccurred(.success)
                onAdded(link)
                dismiss()
            } catch {
                UINotificationFeedbackGenerator().notificationOccurred(.error)
                errorText = error.localizedDescription
            }
        }
    }
}

/// The camera, for one photo.
private struct CameraCapture: UIViewControllerRepresentable {
    var onImage: (UIImage) -> Void
    var onClose: () -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onImage: onImage, onClose: onClose)
    }

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ picker: UIImagePickerController, context: Context) {}

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let onImage: (UIImage) -> Void
        let onClose: () -> Void

        init(onImage: @escaping (UIImage) -> Void, onClose: @escaping () -> Void) {
            self.onImage = onImage
            self.onClose = onClose
        }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let image = info[.originalImage] as? UIImage {
                onImage(image)
            }
            onClose()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            onClose()
        }
    }
}
#endif
