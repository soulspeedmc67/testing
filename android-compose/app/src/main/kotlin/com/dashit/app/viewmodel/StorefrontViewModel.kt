package com.dashit.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dashit.app.data.CleanPhotos
import com.dashit.app.data.model.Category
import com.dashit.app.data.model.CategoryTile
import com.dashit.app.data.model.Offer
import com.dashit.app.data.model.Product
import com.dashit.app.data.repository.FirestoreRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.map
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

    /** Every browseable product as it arrives, before sorting. */
    private val _rawProducts = MutableStateFlow<List<Product>>(emptyList())

    /**
     * Browseable products: in stock before sold out (a sold-out item never
     * leads a list), then items with a photo before items without one, then
     * the owner's own stock before a distributor's, then a clean white photo
     * before other photos. Sorted and grouped off the main thread:
     * with ~4,600 items, doing it on the main thread dropped frames each time
     * the catalogue or a stock level changed.
     */
    val products: StateFlow<List<Product>> = _rawProducts.combine(CleanPhotos.names) { prods, clean ->
        prods.sortedWith(compareBy({ !it.isAvailable }, { it.img.isBlank() }, { it.supplied }, { CleanPhotos.rank(it.img, clean) }))
    }.flowOn(Dispatchers.Default)
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    /** The same products by shelf (lower-case shelf name), in the order above. */
    private val byShelf: StateFlow<Map<String, List<Product>>> = products.map { prods ->
        prods.groupBy { it.cat.trim().lowercase() }
    }.flowOn(Dispatchers.Default)
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyMap())

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
    val categories: StateFlow<List<Category>> = _remoteCategories.combine(byShelf) { remote, shelves ->
        remote.ifEmpty { deriveCategories(shelves) }
    }.flowOn(Dispatchers.Default)
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

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
    val categoryTiles: StateFlow<List<CategoryTile>> = categories.combine(byShelf) { cats, shelves ->
        cats.mapNotNull { cat ->
            val items = shelves[cat.name.trim().lowercase()].orEmpty()
            if (items.isEmpty()) return@mapNotNull null
            CategoryTile(
                id = cat.id,
                name = cat.name,
                previewImages = items.asSequence().map { it.img }.filter { it.isNotBlank() }.distinct().take(4).toList(),
                productCount = items.size
            )
        }
    }.flowOn(Dispatchers.Default)
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    val rails: StateFlow<List<ProductRail>> = categories.combine(byShelf) { cats, shelves ->
        cats.mapNotNull { cat ->
            val matching = shelves[cat.name.trim().lowercase()].orEmpty()
            if (matching.isEmpty()) null
            else ProductRail(id = cat.id, title = cat.name, products = matching.take(12))
        }
    }.flowOn(Dispatchers.Default)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    /**
     * A shelf lists exactly the items filed on it. (It used to pull in items
     * by name too, which put Amul butter on Ice Cream and Dairy Silk on every
     * "Sweets" shelf.)
     */
    val filteredProducts: StateFlow<List<Product>> = combine(products, byShelf, _selectedCategory, _searchQuery) { prods, shelves, cat, query ->
        var list = if (cat.isNullOrBlank()) prods else shelves[cat.trim().lowercase()].orEmpty()
        if (query.trim().isNotEmpty()) {
            val q = query.trim().lowercase()
            list = list.filter {
                it.name.lowercase().contains(q) || it.cat.lowercase().contains(q)
            }
        }
        list
    }.flowOn(Dispatchers.Default)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        viewModelScope.launch {
            repository.observeProducts()
                .map { everything -> everything.partition { it.isAgeRestricted } }
                .flowOn(Dispatchers.Default)
                .collect { (tobacco, browseable) ->
                    _tobaccoProducts.value = tobacco
                    _rawProducts.value = browseable
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

    private fun deriveCategories(shelves: Map<String, List<Product>>): List<Category> {
        val preferredOrder = listOf(
            "Dairy", "Fruits", "Fresh Fruits", "Vegetables", "Staples", "Grocery",
            "Snacks", "Biscuits", "Bakery", "Beverages", "Drinks",
            "Instant Food", "Sweets & Chocolates", "Ice Cream", "Dry Fruits", "Sauces & Spreads",
            "Spices", "Chicken", "Chicken & Fish", "Home Care", "Kitchen Care", "Personal Care",
            "Baby Care", "Health & Wellness", "Pet Care", "Stationery", "Toys & Games", "Electronics"
        )
        // The shelf's name as its first item spells it; how many items it has.
        val counts = shelves.filterKeys { it.isNotEmpty() }
            .map { (_, items) -> items.first().cat.trim() to items.size }.toMap()
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
