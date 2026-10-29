package com.dashit.app.data

import android.content.Context
import android.content.SharedPreferences
import com.dashit.app.data.auth.AuthRepository
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
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

    private val _introOpen = MutableStateFlow(false)
    /** The first-launch sign-in screen is up: the welcome waits until it is gone. */
    val introOpen: StateFlow<Boolean> = _introOpen.asStateFlow()
    fun setIntroOpen(open: Boolean) { _introOpen.value = open }

    private val _credits = MutableSharedFlow<Int>(extraBufferCapacity = 4)
    /** Rupees the shop has just added to this customer's wallet, each time (and only when money is added). */
    val credits: SharedFlow<Int> = _credits.asSharedFlow()

    private var readUid: String? = null
    private var readAt = 0L
    private var registration: ListenerRegistration? = null
    private var watchedUid: String? = null

    /**
     * One listener on the customer's own wallet document: it keeps the balance current
     * the moment the shop adds money, and sends the amount on [credits] when `bonus` goes UP
     * (spending, refunds and cancelled orders don't count). The last bonus seen is kept on
     * the phone; with none kept, the first look only records it, so an old addition isn't
     * celebrated again after a reinstall.
     */
    fun watch() {
        val uid = AuthRepository.uid
        if (uid == null) {
            stopWatching()
            return
        }
        if (uid == watchedUid && registration != null) return
        stopWatching()
        watchedUid = uid
        registration = db.collection("wallets").document(uid).addSnapshotListener { snap, error ->
            if (error != null || snap == null) return@addSnapshotListener
            val bonus = maxOf(0, (snap.get("bonus") as? Number)?.toInt() ?: 0)
            val spent = ((snap.get("used") as? Number)?.toInt() ?: 0) - bonus
            val value = if (snap.exists()) spent else 0
            readUid = uid
            readAt = System.currentTimeMillis()
            _used.value = value
            val key = "bonus_seen_$uid"
            val seen = if (prefs?.contains(key) == true) prefs?.getInt(key, 0) else null
            prefs?.edit()?.putString("uid", uid)?.putInt("used", value)?.putInt(key, bonus)?.apply()
            if (seen != null && bonus > seen) _credits.tryEmit(bonus - seen)
        }
    }

    private fun stopWatching() {
        registration?.remove()
        registration = null
        watchedUid = null
    }

    fun init(context: Context) {
        if (prefs != null) return
        prefs = context.applicationContext.getSharedPreferences("dashit_wallet", Context.MODE_PRIVATE)
        val uid = AuthRepository.uid
        if (uid != null && prefs?.getString("uid", null) == uid) _used.value = prefs?.getInt("used", 0) ?: 0
    }

    /**
     * What is left: the welcome credit, plus any money an admin added, minus what has
     * been spent, never below 0. [used] here is `used - bonus` from the customer's wallet
     * document (see [fetchUsed]), so it is below 0 while added money is unspent.
     */
    fun balance(rules: ShopRules, used: Int = _used.value): Int =
        maxOf(0, rules.walletWelcomeAmount - used)

    /**
     * How much of the wallet an order of [payable] rupees uses: all it can, up to the
     * shop's limit, off the whole bill (items, delivery and handling). It never takes
     * the bill below ₹1, so an order is never free.
     */
    fun toUse(rules: ShopRules, payable: Double, used: Int = _used.value): Int =
        // A per-order limit of 0 means there is none.
        minOf(balance(rules, used), if (rules.walletMaxPerOrder > 0) rules.walletMaxPerOrder else Int.MAX_VALUE, floor(maxOf(0.0, payable)).toInt() - 1).coerceAtLeast(0)

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
            // What was spent, less any money an admin added: below 0 while that money is unspent.
            val value = if (snap.exists()) {
                ((snap.get("used") as? Number)?.toInt() ?: 0) - maxOf(0, (snap.get("bonus") as? Number)?.toInt() ?: 0)
            } else 0
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
        stopWatching()
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
