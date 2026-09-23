import Foundation
import AVFoundation

/// System audio player for celebratory sound effects (order placed, chime)
final class SoundManager {
    static let shared = SoundManager()
    private var audioPlayer: AVAudioPlayer?
    
    private init() {}
    
    func playChime() {
        AudioServicesPlaySystemSound(1057) // Native iOS subtle chime
    }
    
    func playOrderSuccess() {
        AudioServicesPlaySystemSound(1025) // Celebratory iOS sound
    }
}
