import SwiftUI
import UIKit

/// Takes over from the plain midnight launch screen and hands over to the app.
/// The logo builds itself, its four shapes flying in and snapping together,
/// then shrinks and tucks to the left while the letters of "dashit" pop in
/// from its side one after another, in a gentle wave. The lockup then lifts
/// away and the backdrop clears onto the app. Same timings and curves as the
/// Android `SplashOverlay`.
///
/// The animation is Core Animation, not SwiftUI: SwiftUI works each frame out
/// on the main thread, so the app starting up (Firebase, sign-in, push) made
/// the logo and then the letters stutter. Core Animation plays in iOS's render
/// server, so nothing the app does meanwhile can drop its frames.
struct SplashView: View {
    /// Called once the logo and letters have settled and the lockup holds
    /// still: the app can be built underneath without making them stutter.
    var onLogoBuilt: () -> Void = {}
    /// Called as the backdrop starts to clear, so the app can settle into place.
    var onReveal: () -> Void
    /// Called once nothing of the splash is left on screen.
    var onFinish: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        // Backdrop and lockup are both Core Animation layers, fading on the
        // render server, so the hand-over to the shop stays smooth however
        // busy the app is at that moment.
        SplashLockup(reduceMotion: reduceMotion)
        .ignoresSafeArea()
        .allowsHitTesting(false)
        .accessibilityHidden(true)
        .task { await play() }
    }

    /// The moments the app hears about; the lockup's own movement is in `SplashLockupView`.
    private func play() async {
        let t = SplashLockupView.Timeline.self
        let reduced = reduceMotion
        try? await Task.sleep(for: .seconds(reduced ? 0.3 : t.logoBuilt))
        onLogoBuilt()
        try? await Task.sleep(for: .seconds(reduced ? 0.6 : t.exit - t.logoBuilt + 0.08))
        onReveal()
        try? await Task.sleep(for: .seconds(0.46))
        onFinish()
    }
}

private struct SplashLockup: UIViewRepresentable {
    let reduceMotion: Bool

    func makeUIView(context: Context) -> SplashLockupView {
        SplashLockupView(reduceMotion: reduceMotion)
    }

    func updateUIView(_ view: SplashLockupView, context: Context) {}
}

/// The logo and the wordmark as Core Animation layers, centred in the view.
final class SplashLockupView: UIView {
    /// When each part happens, in seconds from the start.
    enum Timeline {
        static let reveal: CFTimeInterval = 0.12
        static let tuck: CFTimeInterval = 0.84
        static let logoBuilt: CFTimeInterval = 1.78
        static let exit: CFTimeInterval = 2.20
    }

    // Lockup geometry, in points around the screen centre.
    private static let logoSize: CGFloat = 114.67
    private static let tuckedLogoX: CGFloat = -82.35
    private static let tuckedLogoScale: CGFloat = 0.5
    private static let wordSize = CGSize(width: 158, height: 34)
    private static let wordX: CGFloat = 29.3
    /// The logo's four shapes (each the full logo-sized image, so they line up
    /// where they are drawn), where each flies in from, and when.
    private static let logoPieces: [(image: String, from: CGSize, delay: CFTimeInterval)] = [
        ("SplashLogoTop", CGSize(width: 0, height: -34), 0),
        ("SplashLogoBottom", CGSize(width: 0, height: 34), 0.06),
        ("SplashLogoArc", CGSize(width: 40, height: 0), 0.14),
        ("SplashLogoBar", CGSize(width: -72, height: 0), 0.22)
    ]
    /// Where each letter of the wordmark starts, as a fraction of its width
    /// (d, a, s, h, i, t), cut in the gaps between the letters.
    private static let letterCuts: [CGFloat] = [0, 0.1862, 0.3936, 0.5727, 0.7713, 0.8652, 1]

    private static let easeOut = CAMediaTimingFunction(controlPoints: 0.22, 1, 0.36, 1)
    private static let easeIn = CAMediaTimingFunction(controlPoints: 0.55, 0, 1, 0.45)
    private static let easeInOut = CAMediaTimingFunction(controlPoints: 0.65, 0, 0.35, 1)

    private let reduceMotion: Bool
    /// The launch screen's midnight, fading away onto the shop at the end.
    private let backdrop = CALayer()
    /// Everything; lifts and fades away at the end.
    private let lockup = CALayer()
    /// The logo; tucks left and shrinks.
    private let logoTuck = CALayer()
    /// The logo; grows a touch as it builds.
    private let logoReveal = CALayer()
    private var pieces: [CALayer] = []
    private var letters: [CALayer] = []
    private var hasStarted = false

    init(reduceMotion: Bool) {
        self.reduceMotion = reduceMotion
        super.init(frame: .zero)
        backgroundColor = .clear
        isUserInteractionEnabled = false
        build()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) is not used") }

    private func build() {
        let scale = UIScreen.main.scale
        backdrop.backgroundColor = UIColor(named: "LaunchBackground")?.cgColor ?? UIColor.black.cgColor
        layer.addSublayer(backdrop)
        layer.addSublayer(lockup)
        lockup.addSublayer(logoTuck)
        logoTuck.addSublayer(logoReveal)

        let logoBounds = CGRect(x: 0, y: 0, width: Self.logoSize, height: Self.logoSize)
        logoTuck.bounds = logoBounds
        logoReveal.bounds = logoBounds
        logoReveal.position = CGPoint(x: logoBounds.midX, y: logoBounds.midY)
        for piece in Self.logoPieces {
            let shape = CALayer()
            shape.contents = UIImage(named: piece.image)?.cgImage
            shape.contentsScale = scale
            shape.contentsGravity = .resizeAspect
            shape.bounds = logoBounds
            shape.position = CGPoint(x: logoBounds.midX, y: logoBounds.midY)
            logoReveal.addSublayer(shape)
            pieces.append(shape)
        }

        let word = UIImage(named: "SplashWordmark")?.cgImage
        for index in 0..<6 {
            let from = Self.letterCuts[index], to = Self.letterCuts[index + 1]
            let letter = CALayer()
            letter.contents = word
            letter.contentsScale = scale
            letter.contentsGravity = .resize
            // Just this letter's strip of the wordmark.
            letter.contentsRect = CGRect(x: from, y: 0, width: to - from, height: 1)
            letter.bounds = CGRect(x: 0, y: 0, width: (to - from) * Self.wordSize.width, height: Self.wordSize.height)
            letter.anchorPoint = CGPoint(x: 0, y: 0.5)
            // Placed relative to the lockup's centre.
            letter.position = CGPoint(x: Self.wordX - Self.wordSize.width / 2 + from * Self.wordSize.width, y: 0)
            lockup.addSublayer(letter)
            letters.append(letter)
        }
        logoTuck.position = .zero
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        lockup.position = CGPoint(x: bounds.midX, y: bounds.midY)
        backdrop.frame = bounds
        CATransaction.commit()
    }

    override func didMoveToWindow() {
        super.didMoveToWindow()
        guard window != nil, !hasStarted else { return }
        hasStarted = true
        reduceMotion ? showStill() : play()
    }

    /// The finished lockup, faded in and out (Reduce Motion).
    private func showStill() {
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        logoTuck.transform = Self.tucked
        lockup.opacity = 0
        CATransaction.commit()
        let fade = CAKeyframeAnimation(keyPath: "opacity")
        fade.values = [0, 1, 1, 0]
        fade.keyTimes = [0, 0.25, 0.75, 1]
        fade.duration = 1.2
        lockup.add(fade, forKey: "still")
        self.fade(backdrop, from: 1, to: 0, at: CACurrentMediaTime() + 0.9, duration: 0.38, timing: Self.easeOut, holdBefore: true)
    }

    private static var tucked: CATransform3D {
        CATransform3DScale(CATransform3DMakeTranslation(tuckedLogoX, 0, 0), tuckedLogoScale, tuckedLogoScale, 1)
    }

    private func play() {
        let start = CACurrentMediaTime()
        let t = Timeline.self

        // Final states first, so each layer stays put once its animation ends.
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        logoTuck.transform = Self.tucked
        lockup.opacity = 0
        lockup.transform = CATransform3DMakeScale(1.08, 1.08, 1)
        CATransaction.commit()

        // 1. The logo builds itself: its shapes fly in one after another.
        scale(logoReveal, from: 0.9, to: 1, at: start + t.reveal, duration: 0.7, timing: Self.easeOut)
        for (index, piece) in Self.logoPieces.enumerated() {
            let begin = start + t.reveal + piece.delay
            pop(pieces[index], from: piece.from, at: begin, duration: 0.46)
            fade(pieces[index], from: 0, to: 1, at: begin, duration: 0.24, timing: Self.easeOut, holdBefore: true)
        }

        // 2. It tucks left, and the letters pop in from its side in a wave.
        let tuck = CABasicAnimation(keyPath: "transform")
        tuck.fromValue = CATransform3DIdentity
        tuck.toValue = Self.tucked
        tuck.beginTime = start + t.tuck
        tuck.duration = 0.56
        tuck.timingFunction = Self.easeInOut
        tuck.fillMode = .backwards
        logoTuck.add(tuck, forKey: "tuck")
        for (index, letter) in letters.enumerated() {
            let begin = start + t.tuck + 0.22 + 0.045 * Double(index)
            pop(letter, from: CGSize(width: -14, height: 7), at: begin, duration: 0.48)
            fade(letter, from: 0, to: 1, at: begin, duration: 0.42, timing: Self.easeOut, holdBefore: true)
        }

        // The lockup is shown throughout, then 3. lifts away and fades.
        fade(lockup, from: 1, to: 0, at: start + t.exit, duration: 0.32, timing: Self.easeIn, holdBefore: true)
        fade(backdrop, from: 1, to: 0, at: start + t.exit + 0.08, duration: 0.38, timing: Self.easeOut, holdBefore: true)
        scale(lockup, from: 1, to: 1.08, at: start + t.exit, duration: 0.32, timing: Self.easeIn)
    }

    private func fade(_ layer: CALayer, from: Float, to: Float, at time: CFTimeInterval, duration: CFTimeInterval,
                      timing: CAMediaTimingFunction, holdBefore: Bool = false) {
        let animation = CABasicAnimation(keyPath: "opacity")
        animation.fromValue = from
        animation.toValue = to
        animation.beginTime = time
        animation.duration = duration
        animation.timingFunction = timing
        // Holding the start value until it begins (the layer's own value is the end one).
        animation.fillMode = holdBefore ? .backwards : .removed
        layer.add(animation, forKey: "fade-\(time)")
        layer.opacity = to
    }

    private func scale(_ layer: CALayer, from: CGFloat, to: CGFloat, at time: CFTimeInterval, duration: CFTimeInterval,
                       timing: CAMediaTimingFunction) {
        let animation = CABasicAnimation(keyPath: "transform.scale")
        animation.fromValue = from
        animation.toValue = to
        animation.beginTime = time
        animation.duration = duration
        animation.timingFunction = timing
        animation.fillMode = .backwards
        layer.add(animation, forKey: "scale-\(time)")
    }

    /// Moves in from `offset`, overshoots a touch and settles: the pop.
    private func pop(_ layer: CALayer, from offset: CGSize, at time: CFTimeInterval, duration: CFTimeInterval) {
        let animation = CAKeyframeAnimation(keyPath: "transform.translation")
        animation.values = [
            NSValue(cgSize: offset),
            NSValue(cgSize: CGSize(width: -offset.width * 0.07, height: -offset.height * 0.07)),
            NSValue(cgSize: .zero)
        ]
        animation.keyTimes = [0, 0.62, 1]
        animation.timingFunctions = [Self.easeOut, CAMediaTimingFunction(name: .easeInEaseOut)]
        animation.beginTime = time
        animation.duration = duration
        animation.fillMode = .backwards
        layer.add(animation, forKey: "pop-\(time)")
    }
}
