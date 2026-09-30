package com.dashit.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dashit.app.data.model.Category
import com.dashit.app.data.model.CategoryTile
import com.dashit.app.data.model.Offer
import com.dashit.app.data.model.Product
import com.dashit.app.data.repository.FirestoreRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class ProductRail(
    val id: String,
    val title: String,
    val products: List<Product>
)

class StorefrontViewModel(
    private val repository: FirestoreRepository = FirestoreRepository()
) : ViewModel() {

    private val _products = MutableStateFlow<List<Product>>(emptyList())
    val products: StateFlow<List<Product>> = _products.asStateFlow()

    /** Tobacco and other 18+ items: never browsed, only listed in the tobacco section. */
    private val _tobaccoProducts = MutableStateFlow<List<Product>>(emptyList())
    val tobaccoProducts: StateFlow<List<Product>> = _tobaccoProducts.asStateFlow()

    /** The shelves set in Firestore's `categories`; empty means "one per product category". */
    private val _remoteCategories = MutableStateFlow<List<Category>>(emptyList())

    /**
     * The shop's shelves: the ones set in Firestore, or else one per category
     * the products actually use, so every item is on a shelf. (Falling back to
     * a fixed list left ~4,100 of 4,651 items on none: the shop's categories
     * are "Others", "Personal Care", "Staples" and so on.)
     */
    val categories: StateFlow<List<Category>> = _remoteCategories.combine(_products) { remote, prods ->
        remote.ifEmpty { deriveCategories(prods) }
    }.stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    private val _offers = MutableStateFlow<List<Offer>>(emptyList())
    val offers: StateFlow<List<Offer>> = _offers.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _selectedCategory = MutableStateFlow<String?>(null)
    val selectedCategory: StateFlow<String?> = _selectedCategory.asStateFlow()

    val isBrowsing: StateFlow<Boolean> = combine(_selectedCategory, _searchQuery) { cat, query ->
        cat == null && query.trim().isEmpty()
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), true)

    /** A tile per shelf with items, showing up to four of its own photos. */
    val categoryTiles: StateFlow<List<CategoryTile>> = categories.combine(_products) { cats, prods ->
        cats.mapNotNull { cat ->
            val items = prods.filter { it.cat.equals(cat.name, ignoreCase = true) }
            if (items.isEmpty()) return@mapNotNull null
            CategoryTile(
                id = cat.id,
                name = cat.name,
                previewImages = items.map { it.img }.filter { it.isNotBlank() }.distinct().take(4),
                productCount = items.size
            )
        }
    }.stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    val rails: StateFlow<List<ProductRail>> = _products.combine(categories) { prods, cats ->
        val effectiveCats = if (cats.isNotEmpty()) cats else deriveCategories(prods)
        effectiveCats.mapNotNull { cat ->
            val matching = prods.filter { it.cat.equals(cat.name, ignoreCase = true) }
            if (matching.isEmpty()) null
            else ProductRail(
                id = cat.id,
                title = cat.name,
                products = matching.take(12)
            )
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val filteredProducts: StateFlow<List<Product>> = combine(_products, _selectedCategory, _searchQuery) { prods, cat, query ->
        var list = prods
        if (!cat.isNullOrBlank()) {
            val filter = cat.lowercase()
            list = list.filter { p ->
                p.cat.lowercase() == filter ||
                (filter == "snacks" && (p.name.contains("chips", true) || p.name.contains("namkeen", true))) ||
                (filter.contains("drinks") && (p.cat.equals("Drinks", true) || p.name.contains("drink", true) || p.name.contains("bull", true))) ||
                (filter.contains("ice cream") && (p.cat.equals("Dairy", true) || p.name.contains("cream", true) || p.name.contains("amul", true))) ||
                (filter.contains("vegetables") && (p.cat.equals("Vegetables", true) || p.cat.equals("Fresh Fruits", true))) ||
                (filter.contains("dairy") && p.cat.equals("Dairy", true)) ||
                (filter.contains("sweets") && (p.name.contains("chocolate", true) || p.name.contains("munch", true) || p.name.contains("silk", true)))
            }
        }
        if (query.trim().isNotEmpty()) {
            val q = query.trim().lowercase()
            list = list.filter {
                it.name.lowercase().contains(q) || it.cat.lowercase().contains(q)
            }
        }
        list
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        viewModelScope.launch {
            repository.observeProducts().collect { everything ->
                val (tobacco, browseable) = everything.partition { it.isAgeRestricted }
                _tobaccoProducts.value = tobacco
                // Items with a photo first, everywhere they're listed.
                _products.value = browseable.sortedBy { it.img.isBlank() }
            }
        }
        viewModelScope.launch {
            repository.observeCategories().collect { _remoteCategories.value = it }
        }
        viewModelScope.launch {
            repository.observeOffers().collect { _offers.value = it }
        }
    }

    fun selectCategory(categoryName: String?) {
        if (_selectedCategory.value == categoryName) {
            _selectedCategory.value = null
        } else {
            _selectedCategory.value = categoryName
        }
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun clearFilter() {
        _selectedCategory.value = null
        _searchQuery.value = ""
    }

    private fun deriveCategories(products: List<Product>): List<Category> {
        val preferredOrder = listOf(
            "Dairy", "Fruits", "Fresh Fruits", "Vegetables", "Staples", "Grocery",
            "Snacks", "Biscuits", "Bakery", "Beverages", "Drinks",
            "Instant Food", "Sweets & Chocolates", "Ice Cream", "Dry Fruits", "Sauces & Spreads",
            "Spices", "Chicken", "Meat & Fish", "Home Care", "Kitchen Care", "Personal Care",
            "Baby Care", "Health & Wellness", "Pet Care", "Stationery", "Toys & Games", "Electronics"
        )
        val counts = products.map { it.cat.trim() }.filter { it.isNotEmpty() }.groupingBy { it }.eachCount()
        // Familiar shelves in store order, then the rest busiest first; "Others" last.
        fun rank(name: String): Int = when {
            name.equals("Others", true) || name.equals("Other", true) -> Int.MAX_VALUE
            else -> preferredOrder.indexOfFirst { it.equals(name, ignoreCase = true) }.let { if (it >= 0) it else Int.MAX_VALUE - 1 }
        }
        val sorted = counts.keys.sortedWith(compareBy<String>({ rank(it) }, { -(counts[it] ?: 0) }))
        return sorted.mapIndexed { index, name ->
            Category(id = name.lowercase().replace(" ", "-"), name = name, sortOrder = index)
        }
    }
}
