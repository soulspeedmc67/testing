package com.dashit.app.viewmodel

import androidx.lifecycle.ViewModel
import com.dashit.app.data.model.CartBillBreakdown
import com.dashit.app.data.model.CartItem
import com.dashit.app.data.model.Coupon
import com.dashit.app.data.model.Product
import com.dashit.app.data.model.ProductVariant
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class CartViewModel : ViewModel() {
    private val _items = MutableStateFlow<List<CartItem>>(emptyList())
    val items: StateFlow<List<CartItem>> = _items.asStateFlow()

    private val _coupon = MutableStateFlow<Coupon?>(null)
    val coupon: StateFlow<Coupon?> = _coupon.asStateFlow()

    private val _bill = MutableStateFlow(CartBillBreakdown.calculate(emptyList()))
    val bill: StateFlow<CartBillBreakdown> = _bill.asStateFlow()

    private val _isCartSheetPresented = MutableStateFlow(false)
    val isCartSheetPresented: StateFlow<Boolean> = _isCartSheetPresented.asStateFlow()

    private val _freeDeliveryCelebration = MutableStateFlow(0)
    /** Ticks when the cart crosses the free-delivery threshold, for the toast. */
    val freeDeliveryCelebration: StateFlow<Int> = _freeDeliveryCelebration.asStateFlow()
    private var celebratedFreeDelivery = false

    private val _isCheckoutPresented = MutableStateFlow(false)
    val isCheckoutPresented: StateFlow<Boolean> = _isCheckoutPresented.asStateFlow()

    val totalQuantity: Int
        get() = _items.value.sumOf { it.qty }

    fun setCartSheetPresented(presented: Boolean) {
        _isCartSheetPresented.value = presented
    }

    fun setCheckoutPresented(presented: Boolean) {
        _isCheckoutPresented.value = presented
    }

    fun quantity(productId: String): Int {
        return _items.value.filter { it.productId == productId }.sumOf { it.qty }
    }

    fun add(product: Product, variant: ProductVariant? = null) {
        val current = _items.value.toMutableList()
        val lineId = variant?.id ?: product.id
        val existingIndex = current.indexOfFirst { it.id == lineId }

        if (existingIndex >= 0) {
            val item = current[existingIndex]
            val max = item.maxQuantity ?: 99
            if (item.qty < max) {
                current[existingIndex] = item.copy(qty = item.qty + 1)
            }
        } else {
            val item = CartItem(
                id = lineId,
                productId = product.id,
                name = if (variant != null) "${product.name} (${variant.unit})" else product.name,
                unit = variant?.unit ?: product.unit,
                price = variant?.price ?: product.price,
                originalPrice = variant?.originalPrice ?: product.originalPrice,
                img = product.img,
                cat = product.cat,
                qty = 1,
                maxQuantity = product.stock
            )
            current.add(item)
        }

        _items.value = current
        recalculateBill()
    }

    fun increment(itemId: String) {
        val current = _items.value.toMutableList()
        val index = current.indexOfFirst { it.id == itemId }
        if (index >= 0) {
            val item = current[index]
            val max = item.maxQuantity ?: 99
            if (item.qty < max) {
                current[index] = item.copy(qty = item.qty + 1)
                _items.value = current
                recalculateBill()
            }
        }
    }

    fun decrement(itemId: String) {
        val current = _items.value.toMutableList()
        val index = current.indexOfFirst { it.id == itemId }
        if (index >= 0) {
            val item = current[index]
            if (item.qty > 1) {
                current[index] = item.copy(qty = item.qty - 1)
            } else {
                current.removeAt(index)
            }
            _items.value = current
            recalculateBill()
        }
    }

    fun decrementLatest(productId: String) {
        val current = _items.value.toMutableList()
        val index = current.indexOfLast { it.productId == productId }
        if (index >= 0) {
            val item = current[index]
            if (item.qty > 1) {
                current[index] = item.copy(qty = item.qty - 1)
            } else {
                current.removeAt(index)
            }
            _items.value = current
            recalculateBill()
        }
    }

    fun reorder(items: List<CartItem>) {
        val current = _items.value.toMutableList()
        items.forEach { incoming ->
            val index = current.indexOfFirst { it.id == incoming.id }
            if (index >= 0) {
                val existing = current[index]
                current[index] = existing.copy(qty = existing.qty + incoming.qty)
            } else {
                current.add(incoming.copy())
            }
        }
        _items.value = current
        recalculateBill()
    }

    fun clear() {
        _items.value = emptyList()
        recalculateBill()
    }

    fun applyCoupon(coupon: Coupon?) {
        _coupon.value = coupon
        recalculateBill()
    }

    private fun recalculateBill() {
        val previousSubtotal = _bill.value.subtotal
        val bill = CartBillBreakdown.calculate(_items.value, _coupon.value)
        _bill.value = bill
        // Once per cart: emptying it (or placing the order) re-arms the toast.
        if (bill.subtotal == 0.0) celebratedFreeDelivery = false
        val threshold = CartBillBreakdown.FREE_DELIVERY_THRESHOLD
        if (previousSubtotal < threshold && bill.subtotal >= threshold && !celebratedFreeDelivery) {
            celebratedFreeDelivery = true
            _freeDeliveryCelebration.value += 1
        }
    }

    companion object {
        val shared = CartViewModel()
    }
}
