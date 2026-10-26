package com.dashit.app.data

import android.content.Context
import android.content.SharedPreferences
import com.dashit.app.data.auth.AuthRepository
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.tasks.await
import kotlin.math.floor

/**
 * The wallet: a welcome credit every customer has, spent on their orders.
 *
 * Nothing is stored for the credit itself. The shop sets the amount on
 * `config/store` ([ShopRules.walletWelcomeAmount], ₹50 unless changed, 0 ends
 * it) and a customer's balance is that amount minus `used` on their
 * `wallets/{uid}` document, which only exists once they have spent some.
 * `firestore.rules` keep `used` from going down, except when an order that used
 * the wallet is cancelled, which gives it back.
 *
 * Same rules as `src/lib/wallet.js` and `ios-swift/DASHit/Core/Utils/Wallet.swift`:
 * keep the three in step.
 */
object Wallet {
    private const val READ_AGAIN_AFTER_MS = 5 * 60 * 1000L
    private val db: FirebaseFirestore by lazy { FirebaseFirestore.getInstance() }
    private var prefs: SharedPreferences? = null

    private val _used = MutableStateFlow(0)
    /** The rupees of the credit this shopper has spent: what the phone last read, 0 before that. */
    val used: StateFlow<Int> = _used.asStateFlow()

    private var readUid: String? = null
    private var readAt = 0L

    fun init(context: Context) {
        if (prefs != null) return
        prefs = context.applicationContext.getSharedPreferences("dashit_wallet", Context.MODE_PRIVATE)
        val uid = AuthRepository.uid
        if (uid != null && prefs?.getString("uid", null) == uid) _used.value = prefs?.getInt("used", 0) ?: 0
    }

    /** What is left: the welcome credit minus what has been spent, never below 0. */
    fun balance(rules: ShopRules, used: Int = _used.value): Int =
        maxOf(0, rules.walletWelcomeAmount - maxOf(0, used))

    /** How much of the wallet an order of [payable] rupees uses: all it can, up to the shop's limit. */
    fun toUse(rules: ShopRules, payable: Double, used: Int = _used.value): Int =
        minOf(balance(rules, used), rules.walletMaxPerOrder, floor(maxOf(0.0, payable)).toInt()).coerceAtLeast(0)

    /**
     * The shopper's `used` from the server, or null when nobody is signed in or
     * the read failed. A few minutes' worth is reused unless [force] is set
     * (placing or cancelling an order, or checking the bill before ordering).
     */
    suspend fun fetchUsed(force: Boolean = false): Int? {
        val uid = AuthRepository.uid ?: return null
        if (!force && readUid == uid && System.currentTimeMillis() - readAt < READ_AGAIN_AFTER_MS) return _used.value
        return try {
            val snap = db.collection("wallets").document(uid).get().await()
            val value = if (snap.exists()) ((snap.get("used") as? Number)?.toInt() ?: 0) else 0
            readUid = uid
            readAt = System.currentTimeMillis()
            _used.value = value
            prefs?.edit()?.putString("uid", uid)?.putInt("used", value)?.apply()
            value
        } catch (e: Exception) {
            null
        }
    }

    /** Signed out: the wallet goes back to showing the full credit. */
    fun reset() {
        readUid = null
        readAt = 0L
        _used.value = 0
    }

    /** The welcome is shown once on a phone. */
    fun welcomeSeen(): Boolean = prefs?.getBoolean("welcome_seen", false) ?: true

    fun markWelcomeSeen() {
        prefs?.edit()?.putBoolean("welcome_seen", true)?.apply()
    }
}
