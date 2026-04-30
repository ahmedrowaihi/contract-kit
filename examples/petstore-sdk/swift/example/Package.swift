// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "PetstoreApp",
    platforms: [.macOS(.v13)],
    products: [
        .executable(name: "PetstoreApp", targets: ["PetstoreApp"]),
    ],
    dependencies: [
        .package(name: "PetstoreSDK", path: "../sdk"),
    ],
    targets: [
        .executableTarget(
            name: "PetstoreApp",
            dependencies: [
                .product(name: "PetstoreSDK", package: "PetstoreSDK"),
            ]
        ),
    ]
)
