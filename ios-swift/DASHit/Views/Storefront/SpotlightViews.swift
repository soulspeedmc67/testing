import SwiftUI

/// The gold colours of the spotlight tab (`Spotlight.swift`), the same as the
/// website's (`src/components/SpotlightShowcase.jsx`). Warm cream and gold in
/// light mode, deep amber-brown with gold type in dark.
enum SpotlightPalette {
    static let gold = Color(hex: 0xE0A200)
    static let glow = Color(hex: 0xFFC21A)
    static let deepInk = Color(hex: 0x4A2E00)
    /// Headings and names on the gold tiles.
    static let ink = Color.adaptive(light: 0x4A2E00, dark: 0xFFE6A0)
    static let inkSoft = Color.adaptive(light: 0x7A5410, dark: 0xC9B27A)
    static let title = Color.adaptive(light: 0x5A3A00, dark: 0xFFD45C)
    /// ADD: dark ink with gold type in light mode, gold with dark type in dark mode.
    static let buttonFill = Color.adaptive(light: 0x4A2E00, dark: 0xFFC93C)
    static let buttonText = Color.adaptive(light: 0xFFD45C, dark: 0x2A1C00)
    static let ornament = Color.adaptive(light: 0xD4900F, dark: 0xFFC93C)

    static let tabFill = LinearGradient(
        colors: [Color(hex: 0xFFE680), Color(hex: 0xFFC21A), Color(hex: 0xE89B00)],
        startPoint: .topLeading, endPoint: .bottomTrailing
    )
    static let labelGradient = LinearGradient(
        colors: [Color.adaptive(light: 0xB26B00, dark: 0xFFD45C), Color.adaptive(light: 0xE39B00, dark: 0xFFF0A8), Color.adaptive(light: 0xB26B00, dark: 0xFFD45C)],
        startPoint: .leading, endPoint: .trailing
    )
    static let tile = LinearGradient(
        colors: [Color.adaptive(light: 0xFFF7DA, dark: 0x3A2B07), Color.adaptive(light: 0xFFE69A, dark: 0x2C2005), Color.adaptive(light: 0xFFCF4D, dark: 0x1E1603)],
        startPoint: .top, endPoint: .bottom
    )
    static let tileBorder = Color.adaptive(light: 0xF2B92B, dark: 0x5C4510)
    /// The page behind the feed while the tab is picked: gold at the top, fading to the page colour.
    static let pageTop = Color.adaptive(light: 0xFFE27A, dark: 0x3D2C00)
    static let pageMid = Color.adaptive(light: 0xFFF0B8, dark: 0x241A03)
    static let pageLow = Color.adaptive(light: 0xFFF8E1, dark: 0x16120A)
}

/// The gold wash behind the whole home feed while the spotlight tab is picked.
struct SpotlightBackdrop: View {
    var body: some View {
        LinearGradient(
            stops: [
                .init(color: SpotlightPalette.pageTop, location: 0),
                .init(color: SpotlightPalette.pageMid, location: 0.3),
                .init(color: SpotlightPalette.pageLow, location: 0.65),
                .init(color: .surface, location: 1)
            ],
            startPoint: .top, endPoint: .bottom
        )
        .ignoresSafeArea()
    }
}

/// Faint sparkles drifting up over the page. Still under Reduce Motion.
struct SpotlightSparkles: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    private let count = 14

    var body: some View {
        TimelineView(.animation(minimumInterval: 1 / 30, paused: reduceMotion)) { context in
            Canvas { canvas, size in
                let t = context.date.timeIntervalSinceReferenceDate
                for i in 0..<count {
                    let seed = Double(i + 1)
                    func r(_ n: Double) -> Double { (sin(seed * n) + 1) / 2 }
                    let period = 7 + r(3.7) * 6
                    let phase = reduceMotion ? 0.5 : ((t / period) + r(5.1)).truncatingRemainder(dividingBy: 1)
                    let x = r(12.9898) * size.width + (r(9.3) - 0.5) * 40 * phase
                    let y = (0.08 + r(78.233) * 0.86) * size.height - 70 * phase
                    let fade = phase < 0.15 ? phase / 0.15 : phase > 0.85 ? (1 - phase) / 0.15 : 1
                    let s = 6 + r(39.425) * 8
                    var star = Path()
                    star.move(to: CGPoint(x: x, y: y - s / 2))
                    star.addQuadCurve(to: CGPoint(x: x + s / 2, y: y), control: CGPoint(x: x + s * 0.08, y: y - s * 0.08))
                    star.addQuadCurve(to: CGPoint(x: x, y: y + s / 2), control: CGPoint(x: x + s * 0.08, y: y + s * 0.08))
                    star.addQuadCurve(to: CGPoint(x: x - s / 2, y: y), control: CGPoint(x: x - s * 0.08, y: y + s * 0.08))
                    star.addQuadCurve(to: CGPoint(x: x, y: y - s / 2), control: CGPoint(x: x - s * 0.08, y: y - s * 0.08))
                    canvas.opacity = (0.3 + r(2.2) * 0.4) * fade
                    canvas.fill(star, with: .color(SpotlightPalette.ornament))
                }
            }
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

/// The spotlight page in the home feed: gold hero with a garland of bulbs,
/// the groups as tall photo tiles, then each group's items in the same style.
struct SpotlightShowcase: View {
    let spotlight: Spotlight
    let sections: [Spotlight.ShownSection]
    /// Items on their own, in no group.
    var items: [Product] = []
    var onJump: (String) -> Void = { _ in }
    var onOpen: (Product) -> Void = { _ in }
    var onRequestAgeConfirmation: (Product) -> Void = { _ in }

    @State private var appeared = false
    private let tileColumns = Array(repeating: GridItem(.flexible(), spacing: 10, alignment: .top), count: 3)
    private let itemColumns = Array(repeating: GridItem(.flexible(), spacing: 10, alignment: .top), count: 2)

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            hero

            // Groups are optional: their tiles and the bunting under them show only when there are some.
            if !sections.isEmpty {
                LazyVGrid(columns: tileColumns, spacing: 12) {
                    ForEach(Array(sections.enumerated()), id: \.element.id) { index, section in
                        SpotlightGroupTile(section: section) { onJump(Self.anchorId(section.id)) }
                            .opacity(appeared ? 1 : 0)
                            .offset(y: appeared ? 0 : 12)
                            .animation(.spring(response: 0.45, dampingFraction: 0.85).delay(Double(index) * 0.04), value: appeared)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 6)

                BuntingRule()
                    .padding(.top, 24)
            }

            // Items on their own: a two-column grid, titled only when groups are there too.
            if !items.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    if !sections.isEmpty {
                        sectionHeading("Top picks", count: nil)
                    }
                    LazyVGrid(columns: itemColumns, spacing: 10) {
                        ForEach(items) { product in
                            SpotlightItemCard(
                                product: product,
                                onOpen: { onOpen(product) },
                                onRequestAgeConfirmation: { onRequestAgeConfirmation(product) }
                            )
                        }
                    }
                    .padding(.horizontal, 16)
                }
                .padding(.top, sections.isEmpty ? 4 : 26)
            }

            ForEach(sections) { section in
                VStack(alignment: .leading, spacing: 12) {
                    sectionHeading(section.name, count: section.products.count)
                        .id(Self.anchorId(section.id))

                    ScrollView(.horizontal, showsIndicators: false) {
                        LazyHStack(alignment: .top, spacing: 10) {
                            ForEach(section.products) { product in
                                SpotlightItemCard(
                                    product: product,
                                    onOpen: { onOpen(product) },
                                    onRequestAgeConfirmation: { onRequestAgeConfirmation(product) }
                                )
                                .frame(width: 152)
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 2)
                    }
                }
                .padding(.top, 26)
            }
        }
        .onAppear { appeared = true }
    }

    static func anchorId(_ sectionId: String) -> String { "spot-\(sectionId)" }

    private func sectionHeading(_ title: String, count: Int?) -> some View {
        HStack(spacing: 8) {
            Rectangle()
                .fill(SpotlightPalette.ornament)
                .frame(width: 8, height: 8)
                .rotationEffect(.degrees(45))
            Text(title)
                .font(.system(size: 18, weight: .heavy))
                .foregroundColor(SpotlightPalette.ink)
            if let count {
                Text("\(count) item\(count == 1 ? "" : "s")")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(SpotlightPalette.inkSoft)
            }
        }
        .padding(.horizontal, 16)
    }

    private var hero: some View {
        VStack(spacing: 0) {
            Garland()
                .frame(height: 44)
            HStack(spacing: 8) {
                Ornament()
                Text(spotlight.title)
                    .font(.system(size: 30, weight: .black, design: .rounded))
                    .foregroundColor(SpotlightPalette.title)
                    .multilineTextAlignment(.center)
                    .minimumScaleFactor(0.7)
                    .lineLimit(2)
                    .shadow(color: SpotlightPalette.glow.opacity(0.35), radius: 10)
                Ornament().scaleEffect(x: -1, y: 1)
            }
            .padding(.horizontal, 16)
            if !spotlight.subtitle.isEmpty {
                Text(spotlight.subtitle)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(SpotlightPalette.inkSoft)
                    .multilineTextAlignment(.center)
                    .padding(.top, 8)
                    .padding(.horizontal, 24)
            }
            Text("CURATED BY DASHIT")
                .font(.system(size: 10.5, weight: .black))
                .tracking(1.8)
                .foregroundColor(SpotlightPalette.inkSoft)
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(.ultraThinMaterial, in: Capsule())
                .overlay(Capsule().strokeBorder(SpotlightPalette.ornament.opacity(0.4), lineWidth: 1))
                .padding(.top, 14)
        }
        .frame(maxWidth: .infinity)
        .padding(.bottom, 22)
        .opacity(appeared ? 1 : 0)
        .animation(.easeOut(duration: 0.35), value: appeared)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isHeader)
    }
}

/// A group's tile: its name across the top, its photo filling the bottom.
struct SpotlightGroupTile: View {
    let section: Spotlight.ShownSection
    let action: () -> Void

    private var shape: RoundedRectangle { RoundedRectangle(cornerRadius: 22, style: .continuous) }

    var body: some View {
        Button {
            HapticsManager.shared.light()
            action()
        } label: {
            VStack(spacing: 4) {
                Text(section.name)
                    .font(.system(size: 13, weight: .heavy))
                    .foregroundColor(SpotlightPalette.ink)
                    .multilineTextAlignment(.center)
                    .lineLimit(2, reservesSpace: true)
                    .padding(.horizontal, 6)
                    .padding(.top, 12)
                // The photo sits in a rounded well inset in the tile, so a photo
                // with its own background never shows square corners on the gold.
                Color.white.opacity(0.92)
                    .overlay {
                        CachedAsyncImage(url: URL(string: section.img), transaction: Transaction(animation: .easeOut(duration: 0.2))) { phase in
                            switch phase {
                            case .success(let image):
                                image.resizable().scaledToFit()
                            default:
                                Color.clear
                            }
                        }
                        .padding(5)
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .strokeBorder(SpotlightPalette.tileBorder.opacity(0.35), lineWidth: 1)
                    )
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .padding(.horizontal, 8)
                    .padding(.bottom, 8)
                    .padding(.top, 2)
            }
            .frame(maxWidth: .infinity)
            .aspectRatio(0.8, contentMode: .fit)
            .background(SpotlightPalette.tile, in: shape)
            .overlay(shape.strokeBorder(SpotlightPalette.tileBorder.opacity(0.7), lineWidth: 1))
            .clipShape(shape)
            .shadow(color: Color(hex: 0xA06400).opacity(0.18), radius: 10, y: 6)
        }
        .buttonStyle(PressableButtonStyle(scale: 0.96))
        .accessibilityLabel(section.name)
        .accessibilityHint("Shows this group's items")
    }
}

/// One item in the gold tile style: name on top, photo, then price and ADD.
struct SpotlightItemCard: View {
    let product: Product
    var onOpen: () -> Void = {}
    var onRequestAgeConfirmation: () -> Void = {}

    @ObservedObject private var cart = CartViewModel.shared
    private var shape: RoundedRectangle { RoundedRectangle(cornerRadius: 22, style: .continuous) }
    private var hasVariants: Bool { (product.variants?.count ?? 0) > 1 }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(product.name)
                .font(.system(size: 12.5, weight: .heavy))
                .foregroundColor(SpotlightPalette.ink)
                .multilineTextAlignment(.center)
                .lineLimit(2, reservesSpace: true)
                .frame(maxWidth: .infinity)
                .padding(.horizontal, 10)
                .padding(.top, 12)

            Color.white
                .aspectRatio(1, contentMode: .fit)
                .overlay {
                    CachedAsyncImage(url: URL(string: product.img), transaction: Transaction(animation: .easeOut(duration: 0.2))) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().scaledToFit().padding(6)
                        case .failure:
                            Text(String(product.name.first { $0.isLetter || $0.isNumber } ?? "?").uppercased())
                                .font(.system(size: 30, weight: .black))
                                .foregroundColor(.gray.opacity(0.5))
                        default:
                            ShimmerView()
                        }
                    }
                }
                .overlay(alignment: .topLeading) {
                    if let percent = product.discountPercent, percent > 0 {
                        Text("\(percent)% OFF")
                            .font(.system(size: 9.5, weight: .black))
                            .foregroundColor(.white)
                            .padding(.horizontal, 7)
                            .padding(.vertical, 3)
                            .background(Color(hex: 0xB3261E), in: Capsule())
                            .padding(6)
                    }
                }
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .opacity(product.isAvailable ? 1 : 0.5)
                .padding(.horizontal, 10)
                .padding(.top, 6)

            HStack(alignment: .bottom, spacing: 6) {
                VStack(alignment: .leading, spacing: 2) {
                    if !product.unit.isEmpty {
                        Text(product.unit)
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(SpotlightPalette.inkSoft)
                            .lineLimit(1)
                    }
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text(CurrencyFormatter.format(product.price))
                            .font(.system(size: 15, weight: .black, design: .rounded))
                            .foregroundColor(SpotlightPalette.ink)
                        if let original = product.originalPrice, original > product.price {
                            Text(CurrencyFormatter.format(original))
                                .font(.system(size: 10.5, weight: .semibold))
                                .foregroundColor(SpotlightPalette.inkSoft.opacity(0.8))
                                .strikethrough(true)
                        }
                    }
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
                }
                Spacer(minLength: 0)
                addControl
            }
            .padding(.horizontal, 10)
            .padding(.top, 8)
            .padding(.bottom, 10)
        }
        .background(SpotlightPalette.tile, in: shape)
        .overlay(shape.strokeBorder(SpotlightPalette.tileBorder.opacity(0.7), lineWidth: 1))
        .shadow(color: Color(hex: 0xA06400).opacity(0.16), radius: 10, y: 6)
        .contentShape(shape)
        .onTapGesture(perform: onOpen)
        .accessibilityElement(children: .contain)
        .accessibilityAddTraits(.isButton)
    }

    @ViewBuilder
    private var addControl: some View {
        let quantity = cart.quantity(for: product.id)
        if !product.isAvailable {
            Text("Sold out")
                .font(.system(size: 10.5, weight: .heavy))
                .foregroundColor(SpotlightPalette.inkSoft)
                .padding(.horizontal, 8)
                .frame(height: 32)
                .background(Color.black.opacity(0.08), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        } else if quantity == 0 {
            Button(action: handleAdd) {
                Text("ADD")
                    .font(.system(size: 13, weight: .black, design: .rounded))
                    .foregroundColor(SpotlightPalette.buttonText)
                    .frame(width: 56, height: 32)
                    .background(SpotlightPalette.buttonFill, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
            .buttonStyle(PressableButtonStyle(scale: 0.92))
            .accessibilityLabel("Add \(product.name)")
        } else {
            HStack(spacing: 0) {
                Button {
                    cart.decrementLatest(productId: product.id)
                } label: {
                    Image(systemName: "minus").frame(width: 24, height: 32)
                }
                .accessibilityLabel("One less")
                Text("\(quantity)")
                    .font(.system(size: 13, weight: .black, design: .rounded))
                    .contentTransition(.numericText())
                    .frame(minWidth: 16)
                Button(action: handleIncrement) {
                    Image(systemName: "plus").frame(width: 24, height: 32)
                }
                .accessibilityLabel("One more")
            }
            .font(.system(size: 12, weight: .black))
            .foregroundColor(SpotlightPalette.buttonText)
            .background(SpotlightPalette.buttonFill, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            .animation(.dashitSpring, value: quantity)
        }
    }

    private func handleAdd() {
        if hasVariants {
            onOpen()
        } else if cart.requiresAgeConfirmation(for: product) {
            onRequestAgeConfirmation()
        } else {
            cart.add(product: product)
        }
    }

    private func handleIncrement() {
        if hasVariants { onOpen() } else { cart.add(product: product) }
    }
}

/// A sagging string of bulbs across the top of the hero; they twinkle in turn.
private struct Garland: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    private let bulbs = 15

    var body: some View {
        TimelineView(.animation(minimumInterval: 1 / 20, paused: reduceMotion)) { context in
            Canvas { canvas, size in
                let t = context.date.timeIntervalSinceReferenceDate
                var wire = Path()
                wire.move(to: CGPoint(x: 0, y: size.height * 0.15))
                wire.addQuadCurve(to: CGPoint(x: size.width, y: size.height * 0.15), control: CGPoint(x: size.width / 2, y: size.height * 1.05))
                canvas.stroke(wire, with: .color(SpotlightPalette.ornament.opacity(0.45)), lineWidth: 1)
                for i in 0..<bulbs {
                    let f = Double(i) / Double(bulbs - 1)
                    let x = 0.04 * size.width + f * 0.92 * size.width
                    // On the curve: y = quadratic between the ends and the sag.
                    let y = size.height * (0.15 + 0.9 * 2 * f * (1 - f)) * 0.95
                    let pulse = reduceMotion ? 1 : (sin(t * 2.6 + Double(i % 5) * 1.2) + 1) / 2
                    let glowRect = CGRect(x: x - 7, y: y - 7, width: 14, height: 14)
                    canvas.fill(Path(ellipseIn: glowRect), with: .color(Color(hex: 0xFFC828).opacity(0.18 + 0.32 * pulse)))
                    let r = 3 + 0.8 * pulse
                    canvas.fill(Path(ellipseIn: CGRect(x: x - r, y: y - r, width: r * 2, height: r * 2)), with: .color(Color(hex: 0xFFF3B0).opacity(0.55 + 0.45 * pulse)))
                }
            }
        }
        .accessibilityHidden(true)
    }
}

/// Little diamonds either side of the heading.
private struct Ornament: View {
    var body: some View {
        HStack(spacing: 3) {
            Circle().fill(SpotlightPalette.ornament.opacity(0.8)).frame(width: 4, height: 4)
            Rectangle().fill(SpotlightPalette.ornament).frame(width: 8, height: 8).rotationEffect(.degrees(45))
            Rectangle().fill(SpotlightPalette.ornament.opacity(0.7)).frame(width: 5, height: 5).rotationEffect(.degrees(45))
        }
        .accessibilityHidden(true)
    }
}

/// A row of gold dots, like the bunting under the reference's tiles.
private struct BuntingRule: View {
    var body: some View {
        Canvas { canvas, size in
            var x: CGFloat = 7
            while x < size.width {
                canvas.fill(Path(ellipseIn: CGRect(x: x - 1.8, y: size.height / 2 - 1.8, width: 3.6, height: 3.6)), with: .color(SpotlightPalette.ornament.opacity(0.6)))
                x += 14
            }
        }
        .frame(height: 10)
        .accessibilityHidden(true)
    }
}
