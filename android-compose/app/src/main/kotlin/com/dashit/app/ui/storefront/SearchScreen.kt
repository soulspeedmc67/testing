package com.dashit.app.ui.storefront

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.NorthWest
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.data.ProductSearch
import com.dashit.app.data.RecentSearches
import com.dashit.app.data.model.CartItem
import com.dashit.app.data.model.Category
import com.dashit.app.data.model.Product
import com.dashit.app.ui.components.ProductCard
import com.dashit.app.ui.components.QuantityStepper
import com.dashit.app.ui.components.ShimmerImage

/**
 * Full-page search, opened from the home search bar. Before anything is typed
 * it shows recent searches and popular items; while typing, live suggestions;
 * on Search (or a suggestion), every matching product in a grid.
 */
@Composable
fun SearchScreen(
    products: List<Product>,
    tobaccoProducts: List<Product>,
    categories: List<Category>,
    cartItems: List<CartItem>,
    onOpenProduct: (Product) -> Unit,
    onAdd: (Product) -> Unit,
    onDecrement: (Product) -> Unit,
    onPickCategory: (String) -> Unit = {},
    onClose: () -> Unit
) {
    val view = LocalView.current
    val context = LocalContext.current
    // The small "Categories" button swaps the recent searches for the shop's categories.
    var showCategories by remember { mutableStateOf(false) }
    val focusRequester = remember { FocusRequester() }
    val focusManager = LocalFocusManager.current
    val keyboard = LocalSoftwareKeyboardController.current

    LaunchedEffect(Unit) {
        RecentSearches.attach(context)
        focusRequester.requestFocus()
    }
    val recents by RecentSearches.terms.collectAsState()

    var field by remember { mutableStateOf(TextFieldValue("")) }
    // The search that was run. While it differs from what's typed, the shopper
    // is still typing and sees suggestions.
    var submitted by rememberSaveable { mutableStateOf<String?>(null) }
    var isFocused by remember { mutableStateOf(false) }

    val query = field.text.trim()
    val isShowingResults = submitted != null && submitted == query && query.isNotEmpty()

    fun setText(text: String) {
        field = TextFieldValue(text, selection = TextRange(text.length))
    }

    fun run(term: String) {
        val clean = term.trim()
        if (clean.isEmpty()) return
        HapticsManager.light(view)
        // Only searches that found something are worth offering again.
        if (ProductSearch.results(clean, products).isNotEmpty() || Tobacco.showsCard(clean, tobaccoProducts)) RecentSearches.record(clean)
        setText(clean)
        submitted = clean
        keyboard?.hide()
        focusManager.clearFocus()
    }

    fun quantityOf(product: Product) = cartItems.filter { it.productId == product.id }.sumOf { it.qty }

    // Tobacco: a card under tobacco searches, then the declaration, then the list.
    var isDeclarationOpen by remember { mutableStateOf(false) }
    var isTobaccoListOpen by remember { mutableStateOf(false) }
    fun showsTobacco(term: String) = Tobacco.showsCard(term, tobaccoProducts)
    fun openTobacco() {
        keyboard?.hide()
        focusManager.clearFocus()
        RecentSearches.record(submitted ?: query)
        if (Tobacco.isDeclared(context)) isTobaccoListOpen = true else isDeclarationOpen = true
    }
    val tobaccoList = Tobacco.matches(submitted ?: query, tobaccoProducts).ifEmpty { tobaccoProducts }

    BackHandler(enabled = isTobaccoListOpen) { isTobaccoListOpen = false }
    if (isTobaccoListOpen) {
        TobaccoScreen(
            products = tobaccoList,
            quantityOf = { quantityOf(it) },
            onOpenProduct = onOpenProduct,
            onAdd = onAdd,
            onDecrement = onDecrement,
            onBack = { isTobaccoListOpen = false }
        )
    } else Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DashitColors.Surface)
            .statusBarsPadding()
    ) {
        // Back + search field
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 4.dp, end = 16.dp, top = 6.dp, bottom = 10.dp)
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .clickable {
                        keyboard?.hide()
                        onClose()
                    }
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = DashitColors.TextPrimary,
                    modifier = Modifier.size(22.dp)
                )
            }

            val fieldShape = RoundedCornerShape(16.dp)
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .weight(1f)
                    .height(48.dp)
                    .clip(fieldShape)
                    .background(DashitColors.SurfaceRaised)
                    .border(
                        1.dp,
                        if (isFocused) DashitColors.BrandOrange.copy(alpha = 0.7f) else DashitColors.Hairline,
                        fieldShape
                    )
                    .padding(horizontal = 14.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = null,
                    tint = DashitColors.TextMuted,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(10.dp))
                Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
                    if (field.text.isEmpty()) {
                        Text(
                            text = "Search for milk, bread, snacks…",
                            color = DashitColors.TextMuted,
                            fontSize = 14.sp,
                            maxLines = 1
                        )
                    }
                    BasicTextField(
                        value = field,
                        onValueChange = { field = it },
                        singleLine = true,
                        textStyle = TextStyle(
                            color = DashitColors.TextPrimary,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium
                        ),
                        cursorBrush = SolidColor(DashitColors.BrandOrange),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                        keyboardActions = KeyboardActions(onSearch = { run(field.text) }),
                        modifier = Modifier
                            .fillMaxWidth()
                            .focusRequester(focusRequester)
                            .onFocusChanged { isFocused = it.isFocused }
                    )
                }
                if (field.text.isNotEmpty()) {
                    Icon(
                        imageVector = Icons.Default.Cancel,
                        contentDescription = "Clear search",
                        tint = DashitColors.TextMuted,
                        modifier = Modifier
                            .size(20.dp)
                            .clip(CircleShape)
                            .clickable {
                                setText("")
                                focusRequester.requestFocus()
                            }
                    )
                }
            }
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(DashitColors.Hairline)
        )

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .imePadding(),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 120.dp)
        ) {
            val productRow: LazyListScope.(Product, String) -> Unit = { product, term ->
                item(key = "product_${product.id}") {
                    SearchProductRow(
                        product = product,
                        term = term,
                        quantity = quantityOf(product),
                        onOpen = {
                            if (term.isNotEmpty()) RecentSearches.record(term)
                            onOpenProduct(product)
                        },
                        onAdd = {
                            if (term.isNotEmpty()) RecentSearches.record(term)
                            onAdd(product)
                        },
                        onDecrement = { onDecrement(product) }
                    )
                }
            }

            when {
                isShowingResults -> {
                    val term = submitted.orEmpty()
                    val matches = ProductSearch.results(term, products)
                    if (matches.isEmpty()) {
                        item(key = "empty") { NoResults(term) }
                        if (showsTobacco(term)) {
                            item(key = "tobacco_card") {
                                TobaccoSearchCard(onView = { openTobacco() }, modifier = Modifier.padding(top = 24.dp))
                            }
                        }
                        val popular = ProductSearch.popular(products)
                        if (popular.isNotEmpty()) {
                            item(key = "popular_title") { SectionTitle("Popular right now", top = 28.dp) }
                            popular.forEach { productRow(it, "") }
                        }
                    } else {
                        if (showsTobacco(term)) {
                            item(key = "tobacco_card") {
                                TobaccoSearchCard(onView = { openTobacco() }, modifier = Modifier.padding(bottom = 14.dp))
                            }
                        }
                        item(key = "results_title") {
                            Text(
                                text = "${matches.size} result${if (matches.size == 1) "" else "s"} for “$term”",
                                color = DashitColors.TextSecondary,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(top = 2.dp, bottom = 12.dp)
                            )
                        }
                        items(matches.chunked(3), key = { row -> "grid_${row.first().id}" }) { row ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 5.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                row.forEach { product ->
                                    ProductCard(
                                        product = product,
                                        quantity = quantityOf(product),
                                        modifier = Modifier.weight(1f),
                                        onOpen = { onOpenProduct(product) },
                                        onAdd = { onAdd(product) },
                                        onIncrement = { onAdd(product) },
                                        onDecrement = { onDecrement(product) }
                                    )
                                }
                                repeat(3 - row.size) { Spacer(modifier = Modifier.weight(1f)) }
                            }
                        }
                    }
                }

                query.isEmpty() -> {
                    item(key = "recent_title") {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            SectionTitle(
                                when {
                                    showCategories -> "Categories"
                                    recents.isNotEmpty() -> "Recent searches"
                                    else -> "Popular right now"
                                },
                                modifier = Modifier.weight(1f)
                            )
                            Text(
                                text = if (showCategories) "History" else "Categories",
                                color = DashitColors.TextPrimary,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(10.dp))
                                    .border(1.dp, DashitColors.Hairline, RoundedCornerShape(10.dp))
                                    .clickable {
                                        HapticsManager.selection(view)
                                        showCategories = !showCategories
                                    }
                                    .padding(horizontal = 12.dp, vertical = 7.dp)
                            )
                            if (!showCategories && recents.isNotEmpty()) {
                                Text(
                                    text = "Clear",
                                    color = DashitColors.BrandAccent,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier
                                        .padding(start = 6.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                        .clickable {
                                            HapticsManager.selection(view)
                                            RecentSearches.clear()
                                        }
                                        .padding(horizontal = 8.dp, vertical = 7.dp)
                                )
                            }
                        }
                    }
                    if (showCategories) {
                        val departments = com.dashit.app.data.Departments.of(
                            categories.map { com.dashit.app.data.model.CategoryTile(it.id, it.name, emptyList(), 0) }
                        )
                        departments.forEach { dept ->
                            item(key = "dept_${dept.id}") {
                                Text(
                                    text = dept.name,
                                    color = DashitColors.TextMuted,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier.padding(top = 14.dp, bottom = 2.dp)
                                )
                            }
                            items(dept.tiles, key = { "cat_${it.id}" }) { tile ->
                                Text(
                                    text = tile.name,
                                    color = DashitColors.TextPrimary,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Medium,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(10.dp))
                                        .clickable {
                                            HapticsManager.selection(view)
                                            onPickCategory(tile.name)
                                        }
                                        .padding(vertical = 11.dp)
                                )
                            }
                        }
                    } else {
                    if (recents.isNotEmpty()) {
                        items(recents, key = { "recent_$it" }) { term ->
                            TermRow(
                                icon = Icons.Default.History,
                                text = AnnotatedString(term),
                                onClick = { run(term) },
                                onFill = {
                                    setText("$term ")
                                    focusRequester.requestFocus()
                                }
                            )
                        }
                    }
                    val popular = ProductSearch.popular(products)
                    if (popular.isNotEmpty()) {
                        if (recents.isNotEmpty()) {
                            item(key = "popular_title") { SectionTitle("Popular right now", top = 24.dp) }
                        }
                        popular.forEach { productRow(it, "") }
                    }
                    }
                }

                else -> {
                    val matches = ProductSearch.results(query, products)
                    val categoryMatches = ProductSearch.categories(query, categories.map { it.name })

                    item(key = "search_for") {
                        TermRow(
                            icon = Icons.Default.Search,
                            text = buildAnnotatedString {
                                append("Search for “")
                                withStyle(SpanStyle(fontWeight = FontWeight.SemiBold, color = DashitColors.TextPrimary)) {
                                    append(query)
                                }
                                append("”")
                            },
                            onClick = { run(query) }
                        )
                    }
                    items(categoryMatches, key = { "category_$it" }) { name ->
                        TermRow(
                            icon = Icons.Default.GridView,
                            text = ProductSearch.highlighted(name, query, DashitColors.TextPrimary),
                            detail = "Category",
                            onClick = { run(name) }
                        )
                    }
                    if (matches.isNotEmpty()) {
                        item(key = "products_title") { SectionTitle("Products", top = 16.dp) }
                        matches.take(8).forEach { productRow(it, query) }
                    } else if (!showsTobacco(query)) {
                        item(key = "no_match") {
                            Text(
                                text = "No items match “$query” yet.",
                                color = DashitColors.TextMuted,
                                fontSize = 13.sp,
                                modifier = Modifier.padding(top = 10.dp)
                            )
                        }
                    }
                    if (showsTobacco(query)) {
                        item(key = "tobacco_card") {
                            TobaccoSearchCard(onView = { openTobacco() }, modifier = Modifier.padding(top = 14.dp))
                        }
                    }
                }
            }
        }
    }

    if (isDeclarationOpen) {
        TobaccoDeclarationSheet(
            onConfirm = {
                isDeclarationOpen = false
                isTobaccoListOpen = true
            },
            onDismiss = { isDeclarationOpen = false }
        )
    }

}

@Composable
private fun SectionTitle(title: String, modifier: Modifier = Modifier, top: androidx.compose.ui.unit.Dp = 0.dp) {
    Text(
        text = title,
        color = DashitColors.TextPrimary,
        fontSize = 17.sp,
        fontWeight = FontWeight.Bold,
        modifier = modifier.padding(top = top, bottom = 6.dp)
    )
}

/** A word to search for. [onFill] adds the "fill in" arrow, which puts the text in the field to keep typing. */
@Composable
private fun TermRow(
    icon: ImageVector,
    text: AnnotatedString,
    detail: String? = null,
    onFill: (() -> Unit)? = null,
    onClick: () -> Unit
) {
    val view = LocalView.current
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .weight(1f)
                .heightIn(min = 48.dp)
                .clip(RoundedCornerShape(10.dp))
                .clickable {
                    HapticsManager.selection(view)
                    onClick()
                }
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = DashitColors.TextMuted,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(14.dp))
            Text(
                text = text,
                color = DashitColors.TextSecondary,
                fontSize = 15.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f)
            )
            if (detail != null) {
                Text(
                    text = detail,
                    color = DashitColors.TextFaint,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(start = 8.dp)
                )
            }
        }
        if (onFill != null) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .clickable { onFill() }
            ) {
                Icon(
                    imageVector = Icons.Default.NorthWest,
                    contentDescription = "Edit this search",
                    tint = DashitColors.TextFaint,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}

@Composable
private fun SearchProductRow(
    product: Product,
    term: String,
    quantity: Int,
    onOpen: () -> Unit,
    onAdd: () -> Unit,
    onDecrement: () -> Unit
) {
    val thumbShape = RoundedCornerShape(10.dp)
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .weight(1f)
                .clip(RoundedCornerShape(10.dp))
                .clickable { onOpen() }
        ) {
            ShimmerImage(
                model = ImageRequest.Builder(LocalContext.current)
                    .data(product.img)
                    .crossfade(200)
                    .build(),
                contentDescription = product.name,
                contentScale = ContentScale.Fit,
                letterFallbackFor = product.name,
                modifier = Modifier
                    .size(48.dp)
                    .clip(thumbShape)
                    .background(DashitColors.SurfaceRaised)
                    .border(1.dp, DashitColors.Hairline, thumbShape)
                    .padding(4.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = ProductSearch.highlighted(product.name, term, DashitColors.TextPrimary),
                    color = DashitColors.TextSecondary,
                    fontSize = 15.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "${product.unit} · ${product.displayPrice}",
                    color = DashitColors.TextMuted,
                    fontSize = 12.5.sp,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
        }
        QuantityStepper(
            quantity = quantity,
            isEnabled = product.isAvailable,
            onAdd = onAdd,
            onIncrement = onAdd,
            onDecrement = onDecrement
        )
    }
}

@Composable
private fun NoResults(term: String) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 36.dp)
    ) {
        Icon(
            imageVector = Icons.Default.Search,
            contentDescription = null,
            tint = DashitColors.TextFaint,
            modifier = Modifier.size(30.dp)
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "No results for “$term”",
            color = DashitColors.TextPrimary,
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = "Check the spelling, or try a more general word like “milk” or “rice”.",
            color = DashitColors.TextMuted,
            fontSize = 13.sp,
            textAlign = TextAlign.Center
        )
    }
}
