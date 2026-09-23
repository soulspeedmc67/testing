import SwiftUI

/// ADD button that morphs into a − n + stepper. It animates itself: the swap
/// and the rolling count both use the house spring whenever `quantity` changes.
struct QuantityStepper: View {
    enum Size {
        case compact
        case regular
    }

    let quantity: Int
    var size: Size = .compact
    var isEnabled: Bool = true
    let onAdd: () -> Void
    let onIncrement: () -> Void
    let onDecrement: () -> Void

    private var width: CGFloat { size == .compact ? 72 : 124 }
    private var height: CGFloat { size == .compact ? 32 : 50 }
    private var glyphWidth: CGFloat { size == .compact ? 24 : 42 }
    private var shape: RoundedRectangle {
        RoundedRectangle(cornerRadius: size == .compact ? 9 : 14, style: .continuous)
    }
    private var labelFont: Font {
        .system(size: size == .compact ? 13 : 17, weight: .heavy, design: .rounded)
    }

    var body: some View {
        ZStack {
            if quantity == 0 {
                Button(action: onAdd) {
                    Text(isEnabled ? "ADD" : "Sold out")
                        .font(labelFont)
                        .foregroundColor(isEnabled ? .brandAccent : .textFaint)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                        .frame(width: width, height: height)
                        .background(Color.surface, in: shape)
                        .overlay(shape.strokeBorder(isEnabled ? Color.brandOrange : Color.hairline, lineWidth: 1.2))
                        .contentShape(shape)
                }
                .buttonStyle(PressableButtonStyle(scale: 0.92))
                .disabled(!isEnabled)
                .transition(.scale(scale: 0.8).combined(with: .opacity))
            } else {
                HStack(spacing: 0) {
                    stepButton(symbol: "minus", label: "Remove one", action: onDecrement)
                    Text("\(quantity)")
                        .font(labelFont)
                        .foregroundColor(.white)
                        .monospacedDigit()
                        .contentTransition(.numericText(value: Double(quantity)))
                        .frame(maxWidth: .infinity)
                        .accessibilityLabel("Quantity \(quantity)")
                    stepButton(symbol: "plus", label: "Add one", action: onIncrement)
                }
                .frame(width: width, height: height)
                .background(Color.brandOrange, in: shape)
                .transition(.scale(scale: 0.8).combined(with: .opacity))
            }
        }
        .animation(.dashitSpring, value: quantity)
    }

    private func stepButton(symbol: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: size == .compact ? 11 : 15, weight: .heavy))
                .foregroundColor(.white)
                .frame(width: glyphWidth, height: height)
                .contentShape(Rectangle())
        }
        .buttonStyle(PressableButtonStyle(scale: 0.78))
        .accessibilityLabel(label)
    }
}
