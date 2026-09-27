package com.dashit.app.data

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import com.dashit.app.data.model.Product
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.text.Normalizer

/**
 * Search over the catalogue the shopper can see (tobacco and other 18+ items
 * are already left out when the catalogue loads), ranked the same way as the
 * iOS app: every word typed has to match the name, category or badge; names
 * that start with the text come first, then in-stock and popular items.
 */
object ProductSearch {
    private val combiningMarks = Regex("\\p{Mn}+")
    private val wordBreak = Regex("[^\\p{L}\\p{N}]+")

    fun normalized(text: String): String =
        Normalizer.normalize(text, Normalizer.Form.NFD)
            .replace(combiningMarks, "")
            .lowercase()
            .trim()

    /** Products matching [query], best match first. */
    fun results(query: String, products: List<Product>): List<Product> {
        val q = normalized(query)
        if (q.isEmpty()) return emptyList()
        val words = q.split(Regex("\\s+")).filter { it.isNotEmpty() }
        return products
            .mapNotNull { product -> rank(product, q, words)?.let { product to it } }
            .sortedWith(
                compareBy<Pair<Product, Int>> { it.second }
                    .thenBy { if (it.first.isAvailable) 0 else 1 }
                    .thenByDescending { popularity(it.first) }
                    .thenBy { it.first.name.lowercase() }
            )
            .map { it.first }
    }

    /** Category names the text points at, closest first. */
    fun categories(query: String, names: List<String>, limit: Int = 3): List<String> {
        val q = normalized(query)
        if (q.isEmpty()) return emptyList()
        return names
            .mapNotNull { name ->
                val n = normalized(name)
                when {
                    n.startsWith(q) -> name to 0
                    words(n).any { it.startsWith(q) } -> name to 1
                    else -> null
                }
            }
            .sortedBy { it.second }
            .take(limit)
            .map { it.first }
    }

    /** In-stock items shoppers rate most, for the empty search page. */
    fun popular(products: List<Product>, limit: Int = 6): List<Product> =
        products.filter { it.isAvailable }.sortedByDescending { popularity(it) }.take(limit)

    /** [text] with the part matching [query] in bold. */
    fun highlighted(text: String, query: String, matchColor: Color): AnnotatedString {
        val q = query.trim()
        val start = if (q.isEmpty()) -1 else text.indexOf(q, ignoreCase = true)
        if (start < 0) return AnnotatedString(text)
        val end = start + q.length
        return buildAnnotatedString {
            append(text.substring(0, start))
            withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = matchColor)) {
                append(text.substring(start, end))
            }
            append(text.substring(end))
        }
    }

    /** Lower is better; null when a typed word matches nothing. */
    private fun rank(product: Product, query: String, queryWords: List<String>): Int? {
        val name = normalized(product.name)
        val cat = normalized(product.cat)
        val badge = normalized(product.badge ?: "")
        if (queryWords.any { !(name.contains(it) || cat.contains(it) || badge.contains(it)) }) return null
        return when {
            name.startsWith(query) -> 0
            words(name).any { it.startsWith(query) } -> 1
            name.contains(query) -> 2
            queryWords.all { name.contains(it) } -> 3
            else -> 4
        }
    }

    private fun words(text: String): List<String> = text.split(wordBreak).filter { it.isNotEmpty() }

    private fun popularity(product: Product): Int = product.ratingCount?.toIntOrNull() ?: 0
}

/** The shopper's last few searches, newest first. Kept on this device only. */
object RecentSearches {
    private const val KEY = "terms"
    private const val LIMIT = 8

    private var prefs: SharedPreferences? = null
    private val _terms = MutableStateFlow<List<String>>(emptyList())
    val terms: StateFlow<List<String>> = _terms.asStateFlow()

    fun attach(context: Context) {
        if (prefs != null) return
        prefs = context.applicationContext.getSharedPreferences("dashit_search", Context.MODE_PRIVATE)
        _terms.value = prefs?.getString(KEY, null)
            ?.split('\n')
            ?.filter { it.isNotBlank() }
            ?: emptyList()
    }

    fun record(term: String) {
        val clean = term.trim()
        if (clean.length < 2) return
        val list = listOf(clean) + _terms.value.filterNot { it.equals(clean, ignoreCase = true) }
        save(list.take(LIMIT))
    }

    fun clear() = save(emptyList())

    private fun save(list: List<String>) {
        _terms.value = list
        prefs?.edit()?.putString(KEY, list.joinToString("\n"))?.apply()
    }
}
