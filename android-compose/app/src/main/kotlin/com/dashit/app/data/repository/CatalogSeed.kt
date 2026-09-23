package com.dashit.app.data.repository

import com.dashit.app.data.model.Category
import com.dashit.app.data.model.Offer
import com.dashit.app.data.model.Product
import com.dashit.app.data.model.ProductVariant

object CatalogSeed {
    val categories = listOf(
        Category(id = "all", name = "All", icon = "grid_view"),
        Category(id = "dairy", name = "Dairy", icon = "coffee"),
        Category(id = "snacks", name = "Snacks", icon = "fastfood"),
        Category(id = "grocery", name = "Grocery", icon = "shopping_basket"),
        Category(id = "bakery", name = "Bakery", icon = "cake"),
        Category(id = "drinks", name = "Drinks", icon = "water_drop"),
        Category(id = "fresh_fruits", name = "Fresh Fruits", icon = "nutrition"),
        Category(id = "vegetables", name = "Vegetables", icon = "eco"),
        Category(id = "kitchen_care", name = "Kitchen Care", icon = "kitchen"),
        Category(id = "home_care", name = "Home Care", icon = "cleaning_services"),
        Category(id = "chicken", name = "Chicken", icon = "restaurant")
    )

    val offers = listOf(
        Offer(
            id = "offer_1",
            badge = "DASHIT EXCLUSIVE",
            title = "Gourmet Snacks & Chilled Sips",
            subtitle = "Artisanal crisps, premium chocolates & chilled sodas with fast delivery.",
            priceTag = "From ₹20",
            category = "Snacks",
            promoCode = "CRISP20",
            discountPercent = 20,
            expiresIn = "Ends in 3 hours",
            img = "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80"
        ),
        Offer(
            id = "offer_2",
            badge = "DAILY ESSENTIALS",
            title = "Fresh Dairy & Farm Milk",
            subtitle = "Fresh morning milk, artisan paneer and farm butter in 8 mins.",
            priceTag = "Up to 15% OFF",
            category = "Dairy",
            promoCode = "DAIRY15",
            discountPercent = 15,
            expiresIn = "Valid today",
            img = "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80"
        )
    )

    val products = listOf(
        // Dairy
        Product(
            id = "1",
            name = "Amul Gold Full Cream Milk",
            unit = "500 ml",
            price = 36.0,
            originalPrice = 38.0,
            rating = "4.8",
            ratingCount = "189",
            time = "8 mins",
            options = "2 sizes",
            badge = "Full Cream",
            img = "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80",
            cat = "Dairy",
            variants = listOf(
                ProductVariant(id = "1-500ml", unit = "500 ml", price = 36.0, originalPrice = 38.0),
                ProductVariant(id = "1-1l", unit = "1 L", price = 70.0, originalPrice = 74.0)
            )
        ),
        Product(
            id = "3",
            name = "Mother Dairy Classic Curd",
            unit = "390 g",
            price = 35.0,
            originalPrice = 38.0,
            rating = "4.7",
            ratingCount = "101",
            time = "8 mins",
            options = "2 sizes",
            badge = "Bestseller",
            img = "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&auto=format&fit=crop&q=80",
            cat = "Dairy",
            variants = listOf(
                ProductVariant(id = "3-390g", unit = "390 g", price = 35.0, originalPrice = 38.0),
                ProductVariant(id = "3-1kg", unit = "1 kg", price = 85.0, originalPrice = 95.0)
            )
        ),
        Product(
            id = "11",
            name = "Amul Butter Salted",
            unit = "100 g",
            price = 58.0,
            originalPrice = 60.0,
            rating = "4.9",
            ratingCount = "226",
            time = "8 mins",
            badge = "Bestseller",
            img = "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&auto=format&fit=crop&q=80",
            cat = "Dairy"
        ),
        Product(
            id = "55",
            name = "Amul Fresh Paneer",
            unit = "200 g",
            price = 95.0,
            originalPrice = 105.0,
            rating = "4.7",
            ratingCount = "178",
            time = "8 mins",
            badge = "Fresh",
            img = "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&auto=format&fit=crop&q=80",
            cat = "Dairy"
        ),
        Product(
            id = "56",
            name = "Amul Cheese Slices",
            unit = "100 g",
            price = 85.0,
            originalPrice = 95.0,
            rating = "4.6",
            ratingCount = "144",
            time = "8 mins",
            badge = "Breakfast",
            img = "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&auto=format&fit=crop&q=80",
            cat = "Dairy"
        ),

        // Snacks
        Product(
            id = "5",
            name = "Lay's Magic Masala Chips",
            unit = "50 g",
            price = 20.0,
            originalPrice = 20.0,
            rating = "4.5",
            ratingCount = "48",
            time = "8 mins",
            options = "3 sizes",
            badge = "Snacks",
            img = "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80",
            cat = "Snacks",
            variants = listOf(
                ProductVariant(id = "5-50g", unit = "50 g", price = 20.0, originalPrice = 20.0),
                ProductVariant(id = "5-115g", unit = "115 g", price = 50.0, originalPrice = 55.0),
                ProductVariant(id = "5-200g", unit = "200 g", price = 95.0, originalPrice = 110.0)
            )
        ),
        Product(
            id = "12",
            name = "Nestlé MUNCH Chocolate Bar",
            unit = "12 g",
            price = 10.0,
            originalPrice = 10.0,
            rating = "4.6",
            ratingCount = "357",
            time = "8 mins",
            badge = "Chocolate",
            img = "https://images.unsplash.com/photo-1548907040-4baa42d10919?w=400&auto=format&fit=crop&q=80",
            cat = "Snacks"
        ),
        Product(
            id = "13",
            name = "Cadbury Dairy Milk Silk",
            unit = "150 g",
            price = 175.0,
            originalPrice = 190.0,
            rating = "4.9",
            ratingCount = "512",
            time = "8 mins",
            badge = "Indulgence",
            img = "https://images.unsplash.com/photo-1548907040-4baa42d10919?w=400&auto=format&fit=crop&q=80",
            cat = "Snacks"
        ),

        // Vegetables
        Product(
            id = "40",
            name = "Fresh Onion",
            unit = "1 kg",
            price = 35.0,
            originalPrice = 45.0,
            rating = "4.6",
            ratingCount = "521",
            time = "8 mins",
            badge = "Daily Staple",
            img = "https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=400&auto=format&fit=crop&q=80",
            cat = "Vegetables"
        ),
        Product(
            id = "41",
            name = "Fresh Potato",
            unit = "1 kg",
            price = 32.0,
            originalPrice = 40.0,
            rating = "4.7",
            ratingCount = "487",
            time = "8 mins",
            badge = "Daily Staple",
            img = "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&auto=format&fit=crop&q=80",
            cat = "Vegetables"
        ),
        Product(
            id = "42",
            name = "Fresh Tomato",
            unit = "500 g",
            price = 25.0,
            originalPrice = 32.0,
            rating = "4.5",
            ratingCount = "398",
            time = "8 mins",
            badge = "Farm Fresh",
            img = "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&auto=format&fit=crop&q=80",
            cat = "Vegetables"
        ),
        Product(
            id = "43",
            name = "Kashmiri Haakh Greens",
            unit = "250 g",
            price = 30.0,
            originalPrice = 35.0,
            rating = "4.9",
            ratingCount = "176",
            time = "8 mins",
            badge = "Local Favourite",
            img = "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&auto=format&fit=crop&q=80",
            cat = "Vegetables"
        ),
        Product(
            id = "44",
            name = "Green Capsicum",
            unit = "250 g",
            price = 28.0,
            originalPrice = 35.0,
            rating = "4.4",
            ratingCount = "132",
            time = "8 mins",
            badge = "Farm Fresh",
            img = "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400&auto=format&fit=crop&q=80",
            cat = "Vegetables"
        ),
        Product(
            id = "45",
            name = "Coriander & Green Chilli Combo",
            unit = "1 pack",
            price = 20.0,
            originalPrice = 25.0,
            rating = "4.6",
            ratingCount = "214",
            time = "8 mins",
            badge = "Tadka Pack",
            img = "https://images.unsplash.com/photo-1600335895229-6e75511892c8?w=400&auto=format&fit=crop&q=80",
            cat = "Vegetables"
        ),

        // Fresh Fruits
        Product(
            id = "4",
            name = "Fresh Kashmiri Red Apples",
            unit = "1 kg",
            price = 140.0,
            originalPrice = 170.0,
            rating = "4.9",
            ratingCount = "167",
            time = "8 mins",
            badge = "Orchard Fresh",
            img = "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&auto=format&fit=crop&q=80",
            cat = "Fresh Fruits"
        ),
        Product(
            id = "46",
            name = "Fresh Bananas",
            unit = "6 pcs",
            price = 45.0,
            originalPrice = 55.0,
            rating = "4.6",
            ratingCount = "289",
            time = "8 mins",
            badge = "Everyday",
            img = "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&auto=format&fit=crop&q=80",
            cat = "Fresh Fruits"
        ),
        Product(
            id = "47",
            name = "Nagpur Sweet Oranges",
            unit = "1 kg",
            price = 90.0,
            originalPrice = 110.0,
            rating = "4.7",
            ratingCount = "163",
            time = "8 mins",
            badge = "Juicy",
            img = "https://images.unsplash.com/photo-1547514701-42782101795e?w=400&auto=format&fit=crop&q=80",
            cat = "Fresh Fruits"
        ),

        // Drinks
        Product(
            id = "22",
            name = "Red Bull Energy Drink",
            unit = "250 ml",
            price = 115.0,
            originalPrice = 125.0,
            rating = "4.6",
            ratingCount = "298",
            time = "8 mins",
            badge = "Energy",
            img = "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=400&auto=format&fit=crop&q=80",
            cat = "Drinks"
        )
    )

    val allProducts: List<Product>
        get() = products
}
