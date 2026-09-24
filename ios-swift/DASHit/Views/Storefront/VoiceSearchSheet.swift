import SwiftUI
import Speech
import AVFoundation

/// Speech to text for the home search (web: `VoiceSearchModal`). Listens once,
/// shows the words as they are recognised, and hands back the phrase after a
/// short pause. Recognition stays on the device when the device supports it.
@MainActor
final class VoiceSearchRecognizer: ObservableObject {
    enum Phase: Equatable {
        case idle
        case listening
        case finished
        case denied
        case unavailable
    }

    @Published private(set) var transcript = ""
    @Published private(set) var phase: Phase = .idle
    /// 0…1 microphone level, for the pulsing rings.
    @Published private(set) var level: CGFloat = 0

    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-IN")) ?? SFSpeechRecognizer()
    private let audioEngine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var silenceTimer: Timer?

    func start() {
        Task {
            guard await Self.requestPermissions() else {
                phase = .denied
                return
            }
            guard let recognizer, recognizer.isAvailable else {
                phase = .unavailable
                return
            }
            do {
                try begin(with: recognizer)
            } catch {
                stop()
                phase = .unavailable
            }
        }
    }

    func stop() {
        silenceTimer?.invalidate()
        silenceTimer = nil
        if audioEngine.isRunning {
            audioEngine.stop()
        }
        audioEngine.inputNode.removeTap(onBus: 0)
        request?.endAudio()
        request = nil
        task?.cancel()
        task = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    private func finish() {
        guard phase == .listening else { return }
        stop()
        phase = .finished
    }

    private static func requestPermissions() async -> Bool {
        let speechAllowed = await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                continuation.resume(returning: status == .authorized)
            }
        }
        guard speechAllowed else { return false }
        return await AVAudioApplication.requestRecordPermission()
    }

    private func begin(with recognizer: SFSpeechRecognizer) throws {
        stop()
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.record, mode: .measurement, options: .duckOthers)
        try session.setActive(true, options: .notifyOthersOnDeactivation)

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        if recognizer.supportsOnDeviceRecognition {
            request.requiresOnDeviceRecognition = true
        }
        self.request = request

        let input = audioEngine.inputNode
        let format = input.outputFormat(forBus: 0)
        // No usable microphone (e.g. a simulator without audio input): tapping
        // such a node raises an exception rather than throwing.
        guard format.sampleRate > 0, format.channelCount > 0 else {
            throw CocoaError(.featureUnsupported)
        }
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
            request.append(buffer)
            let level = Self.normalizedLevel(of: buffer)
            Task { @MainActor in
                self?.level = level
            }
        }
        audioEngine.prepare()
        try audioEngine.start()

        transcript = ""
        phase = .listening
        task = recognizer.recognitionTask(with: request) { [weak self] result, error in
            let text = result?.bestTranscription.formattedString
            let isFinal = result?.isFinal ?? false
            Task { @MainActor in
                guard let self else { return }
                if let text, !text.isEmpty {
                    self.transcript = text
                    self.restartSilenceTimer()
                }
                if isFinal || error != nil {
                    self.finish()
                }
            }
        }
        restartSilenceTimer(after: 6)
    }

    /// Stops after a pause, so the shopper does not have to tap anything.
    private func restartSilenceTimer(after interval: TimeInterval = 1.6) {
        silenceTimer?.invalidate()
        silenceTimer = Timer.scheduledTimer(withTimeInterval: interval, repeats: false) { [weak self] _ in
            Task { @MainActor in
                self?.finish()
            }
        }
    }

    private nonisolated static func normalizedLevel(of buffer: AVAudioPCMBuffer) -> CGFloat {
        guard let samples = buffer.floatChannelData?[0], buffer.frameLength > 0 else { return 0 }
        let count = Int(buffer.frameLength)
        var sum: Float = 0
        for index in 0..<count {
            sum += samples[index] * samples[index]
        }
        let rms = sqrt(sum / Float(count))
        // Speech sits roughly between -50 dB and -10 dB.
        let decibels = 20 * log10(max(rms, 0.000_01))
        return CGFloat(min(max((decibels + 50) / 40, 0), 1))
    }
}

/// Bottom sheet that listens and fills the search with what was said.
struct VoiceSearchSheet: View {
    var onResult: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @StateObject private var recognizer = VoiceSearchRecognizer()

    var body: some View {
        VStack(spacing: 20) {
            Text(title)
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.textPrimary)
                .padding(.top, 26)

            ZStack {
                ForEach(0..<3, id: \.self) { ring in
                    Circle()
                        .stroke(Color.brandOrange.opacity(0.28 - Double(ring) * 0.08), lineWidth: 2)
                        .frame(width: 92, height: 92)
                        .scaleEffect(1 + recognizer.level * CGFloat(0.35 + Double(ring) * 0.3))
                }
                Circle()
                    .fill(recognizer.phase == .listening ? Color.brandOrange : Color.surfaceMuted)
                    .frame(width: 84, height: 84)
                Image(systemName: "mic.fill")
                    .font(.system(size: 30, weight: .medium))
                    .foregroundColor(recognizer.phase == .listening ? .white : .textMuted)
            }
            .frame(height: 150)
            .animation(.easeOut(duration: 0.12), value: recognizer.level)

            Text(message)
                .font(.system(size: 17, weight: recognizer.transcript.isEmpty ? .regular : .semibold))
                .foregroundColor(recognizer.transcript.isEmpty ? .textMuted : .textPrimary)
                .multilineTextAlignment(.center)
                .lineLimit(3)
                .padding(.horizontal, 24)
                .frame(minHeight: 48)

            HStack(spacing: 12) {
                Button {
                    dismiss()
                } label: {
                    Text("Cancel")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.textPrimary)
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(Color.surfaceMuted, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.pressable)

                Button {
                    submit()
                } label: {
                    Text(recognizer.phase == .listening ? "Done" : "Try again")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(Color.brandOrange, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.pressable)
            }
            .padding(.horizontal, 20)

            Spacer(minLength: 0)
        }
        .dashitSheet([.height(470)])
        .onAppear {
            recognizer.start()
        }
        .onDisappear {
            recognizer.stop()
        }
        .onChange(of: recognizer.phase) { _, phase in
            if phase == .finished, !recognizer.transcript.isEmpty {
                HapticsManager.shared.success()
                onResult(recognizer.transcript)
                dismiss()
            }
        }
    }

    private var title: String {
        switch recognizer.phase {
        case .listening: return "Listening…"
        case .denied: return "Microphone is off"
        case .unavailable: return "Voice search isn't available"
        case .idle, .finished: return "Search by voice"
        }
    }

    private var message: String {
        if !recognizer.transcript.isEmpty { return "“\(recognizer.transcript)”" }
        switch recognizer.phase {
        case .denied:
            return "Allow microphone and speech recognition for DASHit in Settings."
        case .unavailable:
            return "Speech recognition isn't available right now. Please type instead."
        case .finished:
            return "Didn't catch that. Tap Try again and say a product name."
        default:
            return "Try “amul butter” or “fresh bread”"
        }
    }

    private func submit() {
        if recognizer.phase == .listening {
            if recognizer.transcript.isEmpty {
                recognizer.stop()
                dismiss()
            } else {
                onResult(recognizer.transcript)
                recognizer.stop()
                dismiss()
            }
        } else {
            recognizer.start()
        }
    }
}
