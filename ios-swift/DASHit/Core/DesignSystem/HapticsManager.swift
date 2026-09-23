import UIKit
import CoreHaptics

/// Taptic Engine controller.
///
/// Micro-interactions (stepper ticks, selection, tab changes) use UIKit's
/// generators at reduced intensity, which Apple tunes for latency. The two
/// signature moments, adding to the cart and placing an order, play short
/// CoreHaptics patterns, falling back to UIKit where CoreHaptics is unavailable.
@MainActor
final class HapticsManager {
    static let shared = HapticsManager()

    private let lightGenerator = UIImpactFeedbackGenerator(style: .light)
    private let mediumGenerator = UIImpactFeedbackGenerator(style: .medium)
    private let heavyGenerator = UIImpactFeedbackGenerator(style: .heavy)
    private let rigidGenerator = UIImpactFeedbackGenerator(style: .rigid)
    private let softGenerator = UIImpactFeedbackGenerator(style: .soft)
    private let selectionGenerator = UISelectionFeedbackGenerator()
    private let notificationGenerator = UINotificationFeedbackGenerator()

    private let supportsCoreHaptics = CHHapticEngine.capabilitiesForHardware().supportsHaptics
    private var engine: CHHapticEngine?

    private init() {
        lightGenerator.prepare()
        rigidGenerator.prepare()
        selectionGenerator.prepare()
        makeEngine()
    }

    // MARK: Micro-interactions

    /// Chips, variant pickers, tab changes.
    func selection() {
        selectionGenerator.selectionChanged()
        selectionGenerator.prepare()
    }

    /// A crisp, quiet click for stepper + / - and small toggles.
    func tick() {
        rigidGenerator.impactOccurred(intensity: 0.55)
        rigidGenerator.prepare()
    }

    func light() {
        lightGenerator.impactOccurred(intensity: 0.7)
        lightGenerator.prepare()
    }

    func soft() {
        softGenerator.impactOccurred(intensity: 0.8)
    }

    func medium() {
        mediumGenerator.impactOccurred(intensity: 0.8)
    }

    func rigid() {
        rigidGenerator.impactOccurred()
        rigidGenerator.prepare()
    }

    func heavy() {
        heavyGenerator.impactOccurred()
    }

    // MARK: Signature moments

    /// A sharp tick followed by a soft settle, like an item dropping in a bag.
    func addToCart() {
        let played = play([
            transient(intensity: 0.75, sharpness: 0.85, at: 0),
            transient(intensity: 0.45, sharpness: 0.3, at: 0.07)
        ])
        if !played { medium() }
    }

    func success() {
        let played = play([
            transient(intensity: 0.5, sharpness: 0.6, at: 0),
            transient(intensity: 0.8, sharpness: 0.7, at: 0.1),
            continuous(intensity: 0.35, sharpness: 0.2, at: 0.12, duration: 0.18)
        ])
        if !played { notificationGenerator.notificationOccurred(.success) }
    }

    func warning() {
        notificationGenerator.notificationOccurred(.warning)
    }

    func error() {
        notificationGenerator.notificationOccurred(.error)
    }

    // MARK: CoreHaptics plumbing

    private func makeEngine() {
        guard supportsCoreHaptics else { return }
        do {
            let engine = try CHHapticEngine()
            engine.playsHapticsOnly = true
            engine.isAutoShutdownEnabled = true
            // The engine is reset when the app is backgrounded or the haptic
            // server restarts; bring it back up so the next pattern still plays.
            engine.resetHandler = { [weak self] in
                Task { @MainActor in
                    try? self?.engine?.start()
                }
            }
            try engine.start()
            self.engine = engine
        } catch {
            engine = nil
        }
    }

    /// Returns false when the pattern could not be played, so callers can fall back.
    private func play(_ events: [CHHapticEvent]) -> Bool {
        guard let engine else { return false }
        do {
            try engine.start()
            let pattern = try CHHapticPattern(events: events, parameters: [])
            let player = try engine.makePlayer(with: pattern)
            try player.start(atTime: CHHapticTimeImmediate)
            return true
        } catch {
            return false
        }
    }

    private func transient(intensity: Float, sharpness: Float, at time: TimeInterval) -> CHHapticEvent {
        CHHapticEvent(
            eventType: .hapticTransient,
            parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: intensity),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: sharpness)
            ],
            relativeTime: time
        )
    }

    private func continuous(intensity: Float, sharpness: Float, at time: TimeInterval, duration: TimeInterval) -> CHHapticEvent {
        CHHapticEvent(
            eventType: .hapticContinuous,
            parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: intensity),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: sharpness)
            ],
            relativeTime: time,
            duration: duration
        )
    }
}
