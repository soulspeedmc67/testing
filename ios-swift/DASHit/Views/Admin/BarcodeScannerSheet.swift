import SwiftUI
#if ADMIN_APP_TARGET
import AVFoundation
import UIKit
#endif

extension View {
    /// Opens the camera to read a pack's barcode. Only the admin app has the
    /// camera (and the permission text for it); in the shop app this does nothing.
    func barcodeScanner(isPresented: Binding<Bool>, onFound: @escaping (String) -> Void) -> some View {
        #if ADMIN_APP_TARGET
        sheet(isPresented: isPresented) {
            BarcodeScannerSheet(onFound: onFound)
        }
        #else
        self
        #endif
    }
}

#if ADMIN_APP_TARGET
/// "Scan the barcode": the camera, a box to hold the barcode in, and a light
/// for dim shelves. Closes itself as soon as it reads one.
struct BarcodeScannerSheet: View {
    var onFound: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var access = AVCaptureDevice.authorizationStatus(for: .video)
    @State private var lightOn = false
    @State private var cameraFailed = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()
                switch access {
                case .authorized:
                    if cameraFailed {
                        message("The camera couldn't start. Close this and try again.")
                    } else {
                        CameraBarcodeReader(
                            lightOn: lightOn,
                            onFailed: { cameraFailed = true },
                            onFound: { code in
                                UINotificationFeedbackGenerator().notificationOccurred(.success)
                                onFound(code)
                                dismiss()
                            }
                        )
                        .ignoresSafeArea()
                        guide
                    }
                case .notDetermined:
                    ProgressView()
                        .tint(.white)
                        .task {
                            let granted = await AVCaptureDevice.requestAccess(for: .video)
                            access = granted ? .authorized : .denied
                        }
                default:
                    VStack(spacing: 16) {
                        message("The camera is off for DASHit Admin. Turn it on in Settings to scan barcodes.")
                        Button("Open Settings") {
                            if let url = URL(string: UIApplication.openSettingsURLString) {
                                UIApplication.shared.open(url)
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.orange)
                    }
                }
            }
            .navigationTitle("Scan the barcode")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .primaryAction) {
                    if access == .authorized && !cameraFailed && CameraBarcodeReader.hasLight {
                        Button {
                            lightOn.toggle()
                        } label: {
                            Image(systemName: lightOn ? "flashlight.on.fill" : "flashlight.off.fill")
                        }
                        .accessibilityLabel(lightOn ? "Turn the light off" : "Turn the light on")
                    }
                }
            }
        }
    }

    /// Where to hold the barcode.
    private var guide: some View {
        VStack(spacing: 18) {
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .strokeBorder(Color.white, lineWidth: 3)
                .frame(width: 280, height: 150)
                .shadow(color: .black.opacity(0.4), radius: 8)
            Text("Hold the barcode inside the box")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.white)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(Capsule().fill(Color.black.opacity(0.55)))
        }
        .allowsHitTesting(false)
    }

    private func message(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 16, weight: .medium))
            .foregroundColor(.white)
            .multilineTextAlignment(.center)
            .padding(.horizontal, 32)
    }
}

/// The camera picture, full screen behind the guide box.
private struct CameraBarcodeReader: UIViewControllerRepresentable {
    var lightOn: Bool
    var onFailed: () -> Void
    var onFound: (String) -> Void

    static var hasLight: Bool {
        AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back)?.hasTorch ?? false
    }

    func makeUIViewController(context: Context) -> CameraPreviewController {
        let controller = CameraPreviewController()
        controller.camera.onFound = onFound
        controller.camera.onFailed = onFailed
        return controller
    }

    func updateUIViewController(_ controller: CameraPreviewController, context: Context) {
        controller.camera.setLight(lightOn)
    }

    static func dismantleUIViewController(_ controller: CameraPreviewController, coordinator: ()) {
        controller.camera.stop()
    }
}

private final class CameraPreviewController: UIViewController {
    let camera = BarcodeCamera()
    private var preview: AVCaptureVideoPreviewLayer?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        let layer = AVCaptureVideoPreviewLayer(session: camera.session)
        layer.videoGravity = .resizeAspectFill
        view.layer.addSublayer(layer)
        preview = layer
        camera.start()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        preview?.frame = view.bounds
    }
}

/// Runs the camera and reads the barcode types printed on packs. The session
/// is started and stopped on its own queue, as Apple asks; results arrive on
/// the main queue.
private final class BarcodeCamera: NSObject, AVCaptureMetadataOutputObjectsDelegate {
    let session = AVCaptureSession()
    var onFound: ((String) -> Void)?
    var onFailed: (() -> Void)?

    private let queue = DispatchQueue(label: "com.dashit.admin.barcode-camera")
    private var device: AVCaptureDevice?
    private var reported = false

    func start() {
        queue.async { self.configureAndRun() }
    }

    func stop() {
        queue.async {
            if self.session.isRunning { self.session.stopRunning() }
        }
    }

    func setLight(_ on: Bool) {
        queue.async {
            guard let device = self.device, device.hasTorch else { return }
            let mode: AVCaptureDevice.TorchMode = on ? .on : .off
            guard device.torchMode != mode, (try? device.lockForConfiguration()) != nil else { return }
            device.torchMode = mode
            device.unlockForConfiguration()
        }
    }

    private func configureAndRun() {
        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let input = try? AVCaptureDeviceInput(device: camera),
              session.canAddInput(input) else {
            fail()
            return
        }
        let output = AVCaptureMetadataOutput()
        session.beginConfiguration()
        session.addInput(input)
        guard session.canAddOutput(output) else {
            session.commitConfiguration()
            fail()
            return
        }
        session.addOutput(output)
        output.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
        // Only the maker's barcode (EAN-13/8, UPC): the product databases are keyed
        // by it. Shop price stickers and batch labels (Code 128) are ignored, so
        // the camera can't grab one of those first.
        let wanted: [AVMetadataObject.ObjectType] = [.ean13, .ean8, .upce]
        output.metadataObjectTypes = wanted.filter { output.availableMetadataObjectTypes.contains($0) }
        session.commitConfiguration()

        // Barcodes are small and held close.
        if (try? camera.lockForConfiguration()) != nil {
            if camera.isAutoFocusRangeRestrictionSupported { camera.autoFocusRangeRestriction = .near }
            camera.unlockForConfiguration()
        }
        device = camera
        session.startRunning()
    }

    private func fail() {
        DispatchQueue.main.async { self.onFailed?() }
    }

    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject], from connection: AVCaptureConnection) {
        guard !reported,
              let code = metadataObjects.compactMap({ ($0 as? AVMetadataMachineReadableCodeObject)?.stringValue }).first,
              !code.isEmpty else { return }
        reported = true
        stop()
        onFound?(code)
    }
}
#endif
