package com.dashit.app.data

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.dashit.app.MainActivity
import com.dashit.app.R
import com.dashit.app.data.model.CartItem
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

/**
 * "Your cart is waiting" reminders, for a shopper who left the app with
 * something in the cart and didn't order it. Posted by the phone itself (an
 * alarm set when the app goes to the background), so they need no server,
 * reach signed-out shoppers too, and always match what is in this phone's
 * cart. Same rules as the iPhone app (CartReminders.swift):
 *
 *  - the first one [FIRST_DELAY_MS] after leaving the app, the second
 *    [SECOND_DELAY_MS] after the first, and no more for that cart
 *  - never two within [MIN_GAP_MS], and at most [WEEKLY_CAP] a week
 *  - only between [WINDOW_START_HOUR]:00 and [WINDOW_END_HOUR]:00; a reminder
 *    due outside that waits for the next morning
 *  - none while the app is open; changing the cart starts its count again;
 *    ordering or emptying the cart ends them
 *  - their own channel ("Cart reminders"), and a switch in the profile
 *
 * The cart itself is also kept here, so it is still there when the app is
 * opened from a reminder after Android has closed it.
 */
object CartReminders {
    const val FIRST_DELAY_MS = 30 * 60_000L
    const val SECOND_DELAY_MS = 24 * 3_600_000L
    const val MAX_PER_CART = 2
    const val MIN_GAP_MS = 20 * 3_600_000L
    const val WEEKLY_CAP = 3
    const val WINDOW_START_HOUR = 9
    const val WINDOW_END_HOUR = 21

    const val CHANNEL_ID = "cart_reminders"
    /** Set on the tap intent: MainActivity opens the cart. */
    const val EXTRA_OPEN_CART = "dashit_open_cart"
    private const val PREFS = "dashit_cart"
    private const val KEY_ITEMS = "items"
    private const val KEY_SIGNATURE = "signature"
    private const val KEY_SENT_FOR_CART = "sent_for_cart"
    private const val KEY_LAST_SENT = "last_sent"
    private const val KEY_HISTORY = "history"
    private const val KEY_ENABLED = "reminders_enabled"
    private const val DAY_MS = 86_400_000L

    private var prefs: SharedPreferences? = null

    /** The profile switch. On unless the shopper turned it off. */
    var isEnabled by mutableStateOf(true)
        private set

    fun init(context: Context) {
        val p = prefsOf(context)
        prefs = p
        isEnabled = p.getBoolean(KEY_ENABLED, true)
    }

    fun setEnabled(context: Context, enabled: Boolean) {
        isEnabled = enabled
        prefsOf(context).edit().putBoolean(KEY_ENABLED, enabled).apply()
        if (!enabled) cancel(context)
    }

    fun createChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel(CHANNEL_ID, "Cart reminders", NotificationManager.IMPORTANCE_DEFAULT).apply {
            description = "A reminder when you leave items in your cart"
        }
        context.getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
    }

    // ---- The saved cart --------------------------------------------------

    fun loadCart(context: Context? = null): List<CartItem> {
        val p = context?.let { prefsOf(it) } ?: prefs ?: return emptyList()
        val raw = p.getString(KEY_ITEMS, null) ?: return emptyList()
        return runCatching {
            val array = JSONArray(raw)
            (0 until array.length()).map { i ->
                val o = array.getJSONObject(i)
                CartItem(
                    id = o.getString("id"),
                    productId = o.getString("productId"),
                    name = o.getString("name"),
                    unit = o.optString("unit"),
                    price = o.getDouble("price"),
                    originalPrice = if (o.has("originalPrice")) o.getDouble("originalPrice") else null,
                    img = o.optString("img"),
                    cat = o.optString("cat"),
                    qty = o.optInt("qty", 1).coerceAtLeast(1),
                    maxQuantity = if (o.has("maxQuantity")) o.getInt("maxQuantity") else null
                )
            }
        }.getOrDefault(emptyList())
    }

    /** Called on every cart change. A different cart starts the reminder count again. */
    fun saveCart(items: List<CartItem>) {
        val p = prefs ?: return
        val array = JSONArray()
        items.forEach { item ->
            array.put(JSONObject().apply {
                put("id", item.id); put("productId", item.productId); put("name", item.name)
                put("unit", item.unit); put("price", item.price); put("img", item.img); put("cat", item.cat)
                put("qty", item.qty)
                item.originalPrice?.let { put("originalPrice", it) }
                item.maxQuantity?.let { put("maxQuantity", it) }
            })
        }
        val signature = items.sortedBy { it.id }.joinToString(",") { "${it.id}x${it.qty}" }
        val edit = p.edit().putString(KEY_ITEMS, array.toString())
        if (signature != p.getString(KEY_SIGNATURE, "")) {
            edit.putString(KEY_SIGNATURE, signature).putInt(KEY_SENT_FOR_CART, 0)
        }
        edit.apply()
    }

    // ---- Scheduling ------------------------------------------------------

    /** The app went to the background: set the alarm for the next reminder, if one is due. */
    fun schedule(context: Context) {
        val p = prefsOf(context)
        cancel(context)
        if (!isEnabled || OrderNotifications.needsPermission(context)) return
        if (loadCart(context).isEmpty()) return
        val at = nextTime(p, System.currentTimeMillis()) ?: return
        val alarms = context.getSystemService(AlarmManager::class.java) ?: return
        // Inexact is fine (and needs no special permission): a few minutes either way.
        alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, alarmIntent(context))
    }

    /** The app is open again (or the cart is gone): no reminder pending. */
    fun cancel(context: Context) {
        context.getSystemService(AlarmManager::class.java)?.cancel(alarmIntent(context))
    }

    /** When the next reminder for this cart may go, or null if none should. */
    private fun nextTime(p: SharedPreferences, now: Long): Long? {
        val sent = p.getInt(KEY_SENT_FOR_CART, 0)
        if (sent >= MAX_PER_CART) return null
        val lastSent = p.getLong(KEY_LAST_SENT, 0L)
        var at = if (sent == 0) now + FIRST_DELAY_MS else maxOf(lastSent + SECOND_DELAY_MS, now + FIRST_DELAY_MS)
        if (lastSent > 0) at = maxOf(at, lastSent + MIN_GAP_MS)
        // The weekly cap: wait for the oldest of the week's reminders to drop out.
        val week = history(p).filter { it > now - 7 * DAY_MS }.sorted()
        if (week.size >= WEEKLY_CAP) at = maxOf(at, week[week.size - WEEKLY_CAP] + 7 * DAY_MS)
        return intoWindow(at)
    }

    /** Moves a time outside the day window to the next window opening (plus a little, so they don't all land at 9:00). */
    internal fun intoWindow(at: Long): Long {
        val c = Calendar.getInstance().apply { timeInMillis = at }
        val hour = c.get(Calendar.HOUR_OF_DAY)
        if (hour in WINDOW_START_HOUR until WINDOW_END_HOUR) return at
        if (hour >= WINDOW_END_HOUR) c.add(Calendar.DAY_OF_YEAR, 1)
        c.set(Calendar.HOUR_OF_DAY, WINDOW_START_HOUR)
        c.set(Calendar.MINUTE, 30)
        c.set(Calendar.SECOND, 0)
        c.set(Calendar.MILLISECOND, 0)
        return c.timeInMillis
    }

    private fun history(p: SharedPreferences): List<Long> =
        p.getString(KEY_HISTORY, "").orEmpty().split(",").mapNotNull { it.toLongOrNull() }

    // ---- Showing one ------------------------------------------------------

    internal fun fire(context: Context) {
        val p = prefsOf(context)
        isEnabled = p.getBoolean(KEY_ENABLED, true)
        if (!isEnabled || OrderNotifications.needsPermission(context) || OrderNotifications.isAppInForeground) return
        val items = loadCart(context)
        if (items.isEmpty()) return
        val now = System.currentTimeMillis()
        // An alarm that came early or out of hours (the clock changed, Doze): set it again.
        val due = nextTime(p, now - FIRST_DELAY_MS) ?: return
        if (due > now + 5 * 60_000L) {
            context.getSystemService(AlarmManager::class.java)
                ?.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, due, alarmIntent(context))
            return
        }
        val sent = p.getInt(KEY_SENT_FOR_CART, 0)
        val (title, text) = message(items, sent)
        val open = PendingIntent.getActivity(
            context,
            CHANNEL_ID.hashCode(),
            Intent(context, MainActivity::class.java)
                .putExtra(EXTRA_OPEN_CART, true)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_dashit)
            .setColor(0xFFFF5B00.toInt())
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(open)
            .build()
        try {
            NotificationManagerCompat.from(context).notify(CHANNEL_ID, 0, notification)
        } catch (_: SecurityException) {
            return
        }
        val week = (history(p).filter { it > now - 7 * DAY_MS } + now).joinToString(",")
        p.edit().putInt(KEY_SENT_FOR_CART, sent + 1).putLong(KEY_LAST_SENT, now).putString(KEY_HISTORY, week).apply()
        // The follow-up, if this cart gets one.
        schedule(context)
    }

    /** The wording, from this phone's own cart. */
    internal fun message(items: List<CartItem>, sentBefore: Int): Pair<String, String> {
        val units = items.sumOf { it.qty }
        val first = items.maxByOrNull { it.price * it.qty }?.name ?: "Your items"
        val others = items.size - 1
        val what = if (others <= 0) first else "$first and $others more item${if (others == 1) "" else "s"}"
        val total = items.sumOf { it.price * it.qty }.toInt()
        return if (sentBefore == 0) {
            "Your cart is waiting" to "$what ${if (units == 1) "is" else "are"} still in your cart. Order now and get it delivered in minutes."
        } else {
            "Still want these?" to "Your cart is saved: $units item${if (units == 1) "" else "s"}, ₹$total. Tap to check out."
        }
    }

    private fun alarmIntent(context: Context): PendingIntent = PendingIntent.getBroadcast(
        context,
        1,
        Intent(context, CartReminderReceiver::class.java),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    private fun prefsOf(context: Context): SharedPreferences =
        prefs ?: context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE).also { prefs = it }
}

/** The alarm [CartReminders.schedule] sets. */
class CartReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        CartReminders.createChannel(context)
        CartReminders.fire(context)
    }
}
