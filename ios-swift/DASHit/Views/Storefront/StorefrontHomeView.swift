import SwiftUI

struct StorefrontHomeView: View {
    @StateObject private var vm = StorefrontViewModel()
    @ObservedObject private var cart = CartViewModel.shared
    @State private var selectedProductForVariants: Product? = nil
    @State private var isAddressPickerOpen = false
    
    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]
    
    var body: some View {
        ZStack(alignment: .bottom) {
            Color.obsidianBlack.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header Bar: Delivery Time & Location Pill
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 4) {
                            Image(systemName: "bolt.fill")
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(.dashitAmber)
                            Text("DASHIT IN 8 MINS")
                                .font(.dashitCaptionBold)
                                .foregroundColor(.white)
                        }
                        
                        Button(action: {
                            isAddressPickerOpen = true
                            HapticsManager.shared.light()
                        }) {
                            HStack(spacing: 4) {
                                Text("Lal Chowk, Anantnag")
                                    .font(.dashitBodyBold)
                                    .foregroundColor(.white)
                                Image(systemName: "chevron.down")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(.gray)
                            }
                        }
                    }
                    
                    Spacer()
                    
                    // Profile Button
                    Button(action: {}) {
                        Image(systemName: "person.crop.circle.fill")
                            .font(.system(size: 28))
                            .foregroundColor(.dashitEmerald)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .padding(.bottom, 12)
                
                // Search Bar
                HStack(spacing: 10) {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.gray)
                    TextField("Search 'milk', 'bread', 'chips'...", text: $vm.searchQuery)
                        .font(.dashitBody)
                        .foregroundColor(.white)
                    
                    if !vm.searchQuery.isEmpty {
                        Button(action: { vm.searchQuery = "" }) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.gray)
                        }
                    }
                }
                .padding(12)
                .background(Color.obsidianCard)
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.obsidianBorder, lineWidth: 1)
                )
                .padding(.horizontal, 16)
                .padding(.bottom, 12)
                
                // Scrollable Storefront Feed
                ScrollView {
                    VStack(spacing: 16) {
                        // Hero Banner
                        if let firstOffer = vm.offers.first {
                            HeroBannerView(offer: firstOffer)
                        }
                        
                        // Category Rail
                        CategoryRailView(
                            categories: vm.categories,
                            selectedCategory: vm.selectedCategory,
                            onSelect: { cat in
                                vm.selectCategory(cat)
                            }
                        )
                        
                        // Section Header
                        HStack {
                            Text(vm.selectedCategory ?? "Daily Essentials")
                                .font(.dashitTitle)
                                .foregroundColor(.white)
                            Spacer()
                            Text("\(vm.filteredProducts.count) items")
                                .font(.dashitCaption)
                                .foregroundColor(.gray)
                        }
                        .padding(.horizontal, 16)
                        
                        // Products Grid
                        LazyVGrid(columns: columns, spacing: 12) {
                            ForEach(vm.filteredProducts) { product in
                                ProductCardView(product: product) {
                                    selectedProductForVariants = product
                                }
                            }
                        }
                        .padding(.horizontal, 16)
                        
                        // Safe area bottom spacer for floating cart
                        Color.clear.frame(height: 100)
                    }
                    .padding(.top, 4)
                }
            }
            
            // Bottom Floating Cart Bar
            FloatingCartBarView {
                cart.isCartSheetPresented = true
            }
            .padding(.bottom, 60)
        }
        .sheet(item: $selectedProductForVariants) { product in
            ProductDetailSheet(product: product)
                .presentationDetents([.medium])
        }
        .sheet(isPresented: $cart.isCartSheetPresented) {
            CartSheetView()
                .presentationDetents([.fraction(0.85), .large])
        }
        .sheet(isPresented: $isAddressPickerOpen) {
            AddressPickerMapView()
        }
    }
}
