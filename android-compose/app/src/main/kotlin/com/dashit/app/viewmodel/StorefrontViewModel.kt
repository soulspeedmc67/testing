package com.dashit.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dashit.app.data.model.Category
import com.dashit.app.data.model.CategoryTile
import com.dashit.app.data.model.Offer
import com.dashit.app.data.model.Product
import com.dashit.app.data.repository.CatalogSeed
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

    private val _categories = MutableStateFlow<List<Category>>(CatalogSeed.topCategories)
    val categories: StateFlow<List<Category>> = _categories.asStateFlow()

    private val _offers = MutableStateFlow<List<Offer>>(emptyList())
    val offers: StateFlow<List<Offer>> = _offers.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _selectedCategory = MutableStateFlow<String?>(null)
    val selectedCategory: StateFlow<String?> = _selectedCategory.asStateFlow()

    val isBrowsing: StateFlow<Boolean> = combine(_selectedCategory, _searchQuery) { cat, query ->
        cat == null && query.trim().isEmpty()
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), true)

    val categoryTiles: StateFlow<List<CategoryTile>> = MutableStateFlow<List<CategoryTile>>(CatalogSeed.bestsellerTiles).asStateFlow()

    val rails: StateFlow<List<ProductRail>> = _products.combine(_categories) { prods, cats ->
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
                (filter.contains("chips") && (p.cat.equals("Snacks", true) || p.name.contains("chips", true))) ||
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
            repository.observeProducts().collect { _products.value = it }
        }
        viewModelScope.launch {
            repository.observeCategories().collect { _categories.value = it }
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
            "Snacks", "Chips", "Biscuits", "Bakery", "Beverages", "Drinks",
            "Instant Food", "Spices", "Chicken", "Home Care", "Kitchen Care"
        )
        val names = products.map { it.cat.trim() }.filter { it.isNotEmpty() }.distinct()
        val sorted = names.sortedWith { a, b ->
            val rankA = preferredOrder.indexOfFirst { it.equals(a, ignoreCase = true) }.let { if (it >= 0) it else Int.MAX_VALUE }
            val rankB = preferredOrder.indexOfFirst { it.equals(b, ignoreCase = true) }.let { if (it >= 0) it else Int.MAX_VALUE }
            rankA.compareTo(rankB)
        }
        return sorted.mapIndexed { index, name ->
            Category(id = name.lowercase().replace(" ", "-"), name = name, sortOrder = index)
        }
    }
}
