package com.dashit.app.data

import com.dashit.app.data.model.Coupon
import com.dashit.app.viewmodel.CartViewModel
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * `config/coupons`: the offer codes the shop has switched on in the admin
 * console, readable by everyone. The cart offers these and nothing else.
 */
object Coupons {
    private val _active = MutableStateFlow<List<Coupon>>(emptyList())
    val active: StateFlow<List<Coupon>> = _active.asStateFlow()
    private var registration: ListenerRegistration? = null

    fun start() {
        if (registration != null) return
        registration = FirebaseFirestore.getInstance().collection("config").document("coupons")
            .addSnapshotListener { snapshot, _ ->
                if (snapshot == null) return@addSnapshotListener
                val list = (snapshot.get("list") as? List<*>).orEmpty().mapNotNull { raw ->
                    val item = raw as? Map<*, *> ?: return@mapNotNull null
                    val code = (item["code"] as? String)?.trim()?.uppercase().orEmpty()
                    if (code.isEmpty() || item["active"] == false) return@mapNotNull null
                    // Percent codes aren't understood by this app yet: left out rather than applied as rupees off.
                    if (item["discountType"] == "percent" || item["isPercent"] == true) return@mapNotNull null
                    Coupon(
                        id = code.lowercase(),
                        code = code,
                        title = item["title"] as? String ?: code,
                        description = item["description"] as? String ?: "",
                        discount = (item["discount"] as? Number)?.toDouble() ?: 0.0,
                        minOrder = (item["minOrder"] as? Number)?.toDouble() ?: 0.0,
                        waivesDelivery = (item["waivesDelivery"] as? Boolean) ?: (code == "FREEDEL")
                    )
                }
                Coupon.catalog = list
                _active.value = list
                CartViewModel.shared.couponsChanged()
            }
    }
}
