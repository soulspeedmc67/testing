package com.dashit.app.data.repository

import com.dashit.app.data.model.Category
import com.dashit.app.data.model.CategoryTile
import com.dashit.app.data.model.Product
import com.dashit.app.data.model.ProductVariant

object CatalogSeed {
    val topCategories = listOf(
        Category(id = "all", name = "All", icon = "grid_view"),
        Category(id = "ganeshotsav", name = "Ganeshotsav", icon = "emoji_events"),
        Category(id = "electronics", name = "Electronics", icon = "headphones"),
        Category(id = "beauty", name = "Beauty", icon = "face"),
        Category(id = "gifting", name = "Gifting", icon = "card_giftcard")
    )

    val bestsellerTiles = listOf(
        CategoryTile(
            id = "snacks",
            name = "Snacks",
            previewImages = listOf(
                "https://dashit.co.in/products/catalog/munchies/dsh_064717045ec8.webp",
                "https://dashit.co.in/products/catalog/munchies/dsh_ecf9c2f21047.webp",
                "https://dashit.co.in/products/catalog/sweet_tooth/dsh_40fb79d7a4ed.webp",
                "https://dashit.co.in/products/catalog/sweet_tooth/dsh_54ca4c385433.webp"
            ),
            productCount = 521
        ),
        CategoryTile(
            id = "drinks_juices",
            name = "Drinks & Juices",
            previewImages = listOf(
                "https://dashit.co.in/products/catalog/cold_drinks_juices/dsh_56ad109de49a.webp",
                "https://dashit.co.in/products/catalog/cold_drinks_juices/dsh_ef508213e913.webp",
                "https://dashit.co.in/products/catalog/cold_drinks_juices/dsh_ce15e2d5a6a8.webp",
                "https://dashit.co.in/products/catalog/cold_drinks_juices/dsh_37452daf08a3.webp"
            ),
            productCount = 244
        ),
        CategoryTile(
            id = "ice_creams",
            name = "Ice Creams & More",
            previewImages = listOf(
                "https://dashit.co.in/products/catalog/ice_creams_more/dsh_566cbff635c0.webp",
                "https://dashit.co.in/products/catalog/sweet_tooth/dsh_40fb79d7a4ed.webp",
                "https://dashit.co.in/products/catalog/sweet_tooth/dsh_54ca4c385433.webp",
                "https://dashit.co.in/products/catalog/ice_creams_more/dsh_566cbff635c0.webp"
            ),
            productCount = 55
        ),
        CategoryTile(
            id = "vegetables_fruits",
            name = "Vegetables & Fruits",
            previewImages = listOf(
                "https://dashit.co.in/products/catalog/vegetables_fruits/dsh_8e568c988aab.webp",
                "https://dashit.co.in/products/catalog/vegetables_fruits/dsh_7bfb522cb6a2.webp",
                "https://dashit.co.in/products/catalog/vegetables_fruits/dsh_82097f132679.webp",
                "https://dashit.co.in/products/catalog/vegetables_fruits/dsh_eedf977f633d.webp"
            ),
            productCount = 155
        ),
        CategoryTile(
            id = "dairy_bread_eggs",
            name = "Dairy, Bread & Eggs",
            previewImages = listOf(
                "https://dashit.co.in/products/catalog/dairy_breakfast/dsh_3452dfc18e6f.webp",
                "https://dashit.co.in/products/catalog/dairy_breakfast/dsh_6d2dfca99aa3.webp",
                "https://dashit.co.in/products/catalog/dairy_breakfast/dsh_99300ca80e75.webp",
                "https://dashit.co.in/products/catalog/bakery_biscuits/dsh_4d49d5656aa9.webp"
            ),
            productCount = 27
        ),
        CategoryTile(
            id = "sweets_chocolates",
            name = "Sweets & Chocolates",
            previewImages = listOf(
                "https://dashit.co.in/products/catalog/sweet_tooth/dsh_40fb79d7a4ed.webp",
                "https://dashit.co.in/products/catalog/sweet_tooth/dsh_54ca4c385433.webp",
                "https://dashit.co.in/products/catalog/sweet_tooth/dsh_40fb79d7a4ed.webp",
                "https://dashit.co.in/products/catalog/sweet_tooth/dsh_54ca4c385433.webp"
            ),
            productCount = 269
        )
    )

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
            img = "https://dashit.co.in/products/catalog/dairy_breakfast/dsh_3452dfc18e6f.webp",
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
            img = "",
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
            img = "",
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
            img = "",
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
            img = "https://dashit.co.in/products/catalog/dairy_breakfast/dsh_c59f288321f7.webp",
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
            img = "https://dashit.co.in/products/catalog/munchies/dsh_5ef943762b26.webp",
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
            img = "",
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
            img = "",
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
            img = "https://dashit.co.in/products/catalog/vegetables_fruits/dsh_8e568c988aab.webp",
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
            img = "https://dashit.co.in/products/catalog/vegetables_fruits/dsh_7a8a5e64d740.webp",
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
            img = "https://dashit.co.in/products/catalog/vegetables_fruits/dsh_7bfb522cb6a2.webp",
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
            img = "https://dashit.co.in/products/catalog/vegetables_fruits/dsh_39094237541e.webp",
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
            img = "https://dashit.co.in/products/catalog/vegetables_fruits/dsh_42e04aa0efe6.webp",
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
            img = "",
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
            img = "https://dashit.co.in/products/catalog/vegetables_fruits/dsh_82097f132679.webp",
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
            img = "https://dashit.co.in/products/catalog/vegetables_fruits/dsh_eedf977f633d.webp",
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
            img = "https://dashit.co.in/products/catalog/vegetables_fruits/dsh_bb213bd74c7a.webp",
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
            img = "",
            cat = "Drinks"
        )
    )

    val allProducts: List<Product>
        get() = products
}
