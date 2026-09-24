package com.dashit.app.ui.orders

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable
import com.dashit.app.data.model.CartBillBreakdown
import com.dashit.app.data.model.CartItem
import com.dashit.app.data.model.Coupon
import com.dashit.app.data.model.Order
import com.dashit.app.data.model.Product
import com.dashit.app.data.repository.OrderRepository
import com.dashit.app.ui.components.QuantityStepper
import com.dashit.app.viewmodel.CartViewModel
import kotlinx.coroutines.launch

/**
 * Adds items to an order during its 60-second change window, like the iOS
 * `AddItemsSheet`: search and aisles over the live catalogue, steppers, and
 * one "Update order" that replaces the order with everything together.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddItemsSheet(
    order: Order,
    products: List<Product>,
    onUpdated: (Order) -> Unit,
    onDismiss: () -> Unit
) {
    val view = LocalView.current
    val scope = rememberCoroutineScope()
    val additions = remember { mutableStateMapOf<String, Int>() }
    var query by remember { mutableStateOf("") }
    var aisle by remember { mutableStateOf<String?>(null) }
    var isSaving by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val seconds = rememberModifySecondsRemaining(order)
    val windowOpen = seconds > 0

    val available = remember(products) { products.filter { it.inStock != false } }
    val aisles = remember(available) { available.map { it.cat }.filter { it.isNotBlank() }.distinct() }
    val visible = available.filter { product ->
        (aisle == null || product.cat == aisle) &&
            (query.isBlank() || product.name.contains(query.trim(), ignoreCase = true))
    }
    val picked = additions.filterValues { it > 0 }.mapNotNull { (id, qty) ->
        available.firstOrNull { it.id == id }?.let { p ->
            CartItem(id = p.id, productId = p.id, name = p.name, unit = p.unit, price = p.price, originalPrice = p.originalPrice, img = p.img, cat = p.cat, qty = qty)
        }
    }
    val addedCount = picked.sumOf { it.qty }
    val merged = order.items.map { line -> line.copy(qty = line.qty + (additions[line.id] ?: 0)) } +
        picked.filter { add -> order.items.none { it.id == add.id } }
    val newBill = CartBillBreakdown.calculate(merged, Coupon.find(order.couponCode))

    ModalBottomSheet(
        onDismissRequest = { if (!isSaving) onDismiss() },
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = DashitColors.Surface,
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth().fillMaxHeight(0.92f)) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    Text("Add to your order", color = DashitColors.TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
                    Text(
                        "Everything arrives together, with the same delivery code.",
                        color = DashitColors.TextMuted,
                        fontSize = 12.5.sp
                    )
                }
                if (windowOpen) {
                    Box(
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(DashitColors.TrackerCard)
                            .padding(horizontal = 10.dp, vertical = 7.dp)
                    ) { ModifyCountdownBadge(order) }
                }
            }

            // Search
            Row(
                modifier = Modifier
                    .padding(horizontal = 16.dp, vertical = 12.dp)
                    .fillMaxWidth()
                    .height(46.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(DashitColors.SurfaceRaised)
                    .border(1.dp, DashitColors.Hairline, RoundedCornerShape(14.dp))
                    .padding(horizontal = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(Icons.Filled.Search, contentDescription = null, tint = DashitColors.TextMuted, modifier = Modifier.size(18.dp))
                Box(Modifier.weight(1f)) {
                    if (query.isEmpty()) Text("Search milk, bread, eggs…", color = DashitColors.TextFaint, fontSize = 15.sp)
                    BasicTextField(
                        value = query,
                        onValueChange = { query = it },
                        singleLine = true,
                        textStyle = TextStyle(color = DashitColors.TextPrimary, fontSize = 15.sp),
                        cursorBrush = SolidColor(DashitColors.BrandOrange),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            // Aisles
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                item { AisleChip("All", aisle == null) { aisle = null } }
                items(aisles) { name -> AisleChip(name, aisle == name) { aisle = if (aisle == name) null else name } }
            }

            LazyColumn(
                modifier = Modifier.weight(1f),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                if (visible.isEmpty()) {
                    item {
                        Text(
                            if (query.isBlank()) "Nothing in this aisle right now" else "Nothing matches “$query”",
                            color = DashitColors.TextMuted,
                            fontSize = 14.sp,
                            modifier = Modifier.padding(top = 24.dp)
                        )
                    }
                }
                items(visible, key = { it.id }) { product ->
                    val inOrder = order.items.filter { it.productId == product.id || it.id == product.id }.sumOf { it.qty }
                    val qty = additions[product.id] ?: 0
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(DashitColors.SurfaceRaised)
                            .border(1.dp, DashitColors.Hairline, RoundedCornerShape(16.dp))
                            .padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        AsyncImage(
                            model = product.img,
                            contentDescription = null,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.size(56.dp).clip(RoundedCornerShape(12.dp)).background(DashitColors.SurfaceMuted)
                        )
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text(product.name, color = DashitColors.TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(product.unit, color = DashitColors.TextMuted, fontSize = 12.sp)
                                if (inOrder > 0) Text("· $inOrder in order", color = DashitColors.Positive, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                            }
                            Text("₹${product.price.toInt()}", color = DashitColors.TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        }
                        QuantityStepper(
                            quantity = qty,
                            onAdd = { HapticsManager.light(view); additions[product.id] = 1 },
                            onIncrement = { HapticsManager.light(view); additions[product.id] = qty + 1 },
                            onDecrement = { HapticsManager.light(view); additions[product.id] = (qty - 1).coerceAtLeast(0) }
                        )
                    }
                }
            }

            // Bottom bar
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(DashitColors.SurfaceRaised)
                    .navigationBarsPadding()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                errorMessage?.let { Text(it, color = DashitColors.Danger, fontSize = 13.sp) }
                if (!windowOpen) {
                    Text(
                        "The 60 seconds are up and the store is packing your order. You can still order these separately.",
                        color = DashitColors.TextMuted,
                        fontSize = 13.sp
                    )
                }
                val enabled = addedCount > 0 && !isSaving
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(if (enabled) DashitColors.BrandOrange else DashitColors.SurfaceMuted)
                        .pressable(scale = 0.98f) {
                            if (!enabled) return@pressable
                            if (!windowOpen) {
                                // Too late to change it: carry the picks over to a fresh cart instead.
                                CartViewModel.shared.reorder(picked)
                                HapticsManager.success(view)
                                onDismiss()
                                return@pressable
                            }
                            isSaving = true
                            errorMessage = null
                            scope.launch {
                                try {
                                    val replacement = OrderRepository.shared.addItems(picked, order)
                                    HapticsManager.success(view)
                                    onUpdated(replacement)
                                } catch (e: Exception) {
                                    HapticsManager.error(view)
                                    errorMessage = e.message ?: "Couldn't update the order."
                                } finally {
                                    isSaving = false
                                }
                            }
                        },
                    contentAlignment = Alignment.Center
                ) {
                    if (isSaving) {
                        CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                    } else {
                        val label = when {
                            addedCount == 0 -> "Pick items to add"
                            !windowOpen -> "Add to cart instead"
                            else -> "Update order · +$addedCount · ₹${newBill.grandTotal.toInt()}"
                        }
                        Text(label, color = if (enabled) Color.White else DashitColors.TextMuted, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun AisleChip(title: String, selected: Boolean, onClick: () -> Unit) {
    val view = LocalView.current
    Text(
        text = title,
        color = if (selected) Color.White else DashitColors.TextSecondary,
        fontSize = 13.sp,
        fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
        modifier = Modifier
            .clip(CircleShape)
            .background(if (selected) DashitColors.BrandOrange else DashitColors.SurfaceRaised)
            .border(1.dp, if (selected) DashitColors.BrandOrange else DashitColors.Hairline, CircleShape)
            .pressable(scale = 0.95f) {
                HapticsManager.selection(view)
                onClick()
            }
            .padding(horizontal = 14.dp, vertical = 8.dp)
    )
}
