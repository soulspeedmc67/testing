import UIKit

/// High-precision native iOS taptic engine controller
@MainActor
final class HapticsManager {
    static let shared = HapticsManager()
    
    private let lightGenerator = UIImpactFeedbackGenerator(style: .light)
    private let mediumGenerator = UIImpactFeedbackGenerator(style: .medium)
    private let heavyGenerator = UIImpactFeedbackGenerator(style: .heavy)
    private let rigidGenerator = UIImpactFeedbackGenerator(style: .rigid)
    private let selectionGenerator = UISelectionFeedbackGenerator()
    private let notificationGenerator = UINotificationFeedbackGenerator()
    
    private init() {
        lightGenerator.prepare()
        mediumGenerator.prepare()
        selectionGenerator.prepare()
    }
    
    func selection() {
        selectionGenerator.selectionChanged()
    }
    
    func light() {
        lightGenerator.impactOccurred()
    }
    
    func medium() {
        mediumGenerator.impactOccurred()
    }
    
    func rigid() {
        rigidGenerator.impactOccurred()
    }
    
    func heavy() {
        heavyGenerator.impactOccurred()
    }
    
    func success() {
        notificationGenerator.notificationOccurred(.success)
    }
    
    func warning() {
        notificationGenerator.notificationOccurred(.warning)
    }
    
    func error() {
        notificationGenerator.notificationOccurred(.error)
    }
}
