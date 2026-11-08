import AVFoundation
import Foundation
import UIKit

/// The loud new-order alarm of the admin app: Resources/order_alarm.wav on a
/// loop until someone silences it, opens the order, or 60 seconds pass.
///
/// The `.playback` audio category is what lets it ring with the silent switch
/// on. iOS gives an app no way to raise the volume itself, so it rings at the
/// phone's current volume. (The same file is sent as the push sound when the
/// app is closed: see `public/api/push/_push.php`.)
@MainActor
public final class OrderAlarm: ObservableObject {
    public static let shared = OrderAlarm()

    /// True while the alarm is sounding; drives the red "tap to silence" bar.
    @Published public private(set) var isRinging = false

    /// Where the alarm gives up by itself, so a forgotten phone doesn't ring all night.
    private static let maxSeconds: Duration = .seconds(60)

    private var player: AVAudioPlayer?
    private var stopTask: Task<Void, Never>?
    private var buzzTask: Task<Void, Never>?

    private init() {}

    public func start() {
        guard !isRinging else { return }
        guard let url = Bundle.main.url(forResource: "order_alarm", withExtension: "wav") else { return }
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default)
            try session.setActive(true)
            let player = try AVAudioPlayer(contentsOf: url)
            player.numberOfLoops = -1
            player.volume = 1
            player.prepareToPlay()
            guard player.play() else { return }
            self.player = player
        } catch {
            return
        }
        isRinging = true

        buzzTask = Task {
            while !Task.isCancelled {
                UINotificationFeedbackGenerator().notificationOccurred(.warning)
                try? await Task.sleep(for: .seconds(1.5))
            }
        }
        stopTask = Task { [weak self] in
            try? await Task.sleep(for: Self.maxSeconds)
            if !Task.isCancelled { self?.stop() }
        }
    }

    public func stop() {
        stopTask?.cancel()
        stopTask = nil
        buzzTask?.cancel()
        buzzTask = nil
        guard isRinging else { return }
        isRinging = false
        player?.stop()
        player = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }
}

/// The red bar across the top of the admin screens while the alarm rings.
struct OrderAlarmBanner: View {
    @ObservedObject private var alarm = OrderAlarm.shared

    var body: some View {
        if alarm.isRinging {
            Button {
                alarm.stop()
            } label: {
                HStack(spacing: 10) {
                    Image(systemName: "bell.and.waves.left.and.right.fill")
                    Text("New order — tap to silence")
                        .font(.system(size: 16, weight: .bold))
                    Spacer()
                    Image(systemName: "speaker.slash.fill")
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .frame(maxWidth: .infinity)
                .background(Color(red: 0.85, green: 0.11, blue: 0.14))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("New order. Tap to silence the alarm.")
        }
    }
}
