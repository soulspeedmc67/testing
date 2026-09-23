// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "DASHit",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "DASHitCore",
            targets: ["DASHitCore"]
        )
    ],
    dependencies: [
        .package(
            url: "https://github.com/firebase/firebase-ios-sdk.git",
            .upToNextMajor(from: "10.28.0")
        )
    ],
    targets: [
        .target(
            name: "DASHitCore",
            dependencies: [
                .product(name: "FirebaseAuth", package: "firebase-ios-sdk"),
                .product(name: "FirebaseFirestore", package: "firebase-ios-sdk"),
                .product(name: "FirebaseCore", package: "firebase-ios-sdk")
            ],
            path: "DASHit"
        )
    ]
)
