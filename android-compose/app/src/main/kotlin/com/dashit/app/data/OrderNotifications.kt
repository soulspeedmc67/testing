package com.dashit.app.data

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.dashit.app.MainActivity
import com.dashit.app.R
import com.dashit.app.data.model.Order

/**
 * Local notifications about the shopper's order. The app posts them itself when
 * it hears the order change while it isn't on screen (there is no push server on
 * the Spark plan), so they arrive as long as Android keeps the app alive.
 */
object OrderNotifications {
    private const val CHANNEL_ID = "order_updates"

    /** True while an activity is on screen; set by MainActivity. */
    @Volatile
    var isAppInForeground: Boolean = false

    /** True once the shopper has left the app; false while it is still starting up. */
    @Volatile
    var isAppInBackground: Boolean = false

    fun createChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Order updates",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Your order's progress: placed, packed, on the way, delivered"
        }
        // Messages the shop sends everyone (offers, new items), kept apart so a
        // shopper can turn these off and still hear about their order.
        val news = NotificationChannel(
            NEWS_CHANNEL_ID,
            "Offers & news",
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = "Offers, new items and news from DASHit"
        }
        context.getSystemService(NotificationManager::class.java)?.createNotificationChannels(listOf(channel, news))
    }

    /** The "Offers & news" channel; broadcast.php sends to it too. */
    const val NEWS_CHANNEL_ID = "news"

    /** Android 13+ asks for permission; older versions allow it by default. */
    fun needsPermission(context: Context): Boolean =
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED

    private const val PREFS = "dashit_notifications"
    private const val ASKED_KEY = "asked_permission"

    /** True until the shopper has been asked once. Android stops asking after two refusals anyway. */
    fun shouldAskPermission(context: Context): Boolean =
        needsPermission(context) &&
            !context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(ASKED_KEY, false)

    fun markPermissionAsked(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(ASKED_KEY, true).apply()
    }

    fun notifyDelivered(context: Context, order: Order) {
        // The server's push covers this once the phone is registered.
        if (needsPermission(context) || Push.isActive) return
        val units = order.itemCount
        val open = PendingIntent.getActivity(
            context,
            order.id.hashCode(),
            Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_dashit)
            .setColor(0xFFFF5B00.toInt())
            .setContentTitle("Your order has been delivered")
            .setContentText("$units item${if (units == 1) "" else "s"} · ₹${order.grandTotal.toInt()} · Thank you for shopping with DASHit.")
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(open)
            .build()
        try {
            // Same tag and id as the push for this order, so the two never both show.
            NotificationManagerCompat.from(context).notify(order.id, 0, notification)
        } catch (_: SecurityException) {
            // Permission withdrawn between the check and the post.
        }
    }

    /** A push that arrived while the app is open (the system only shows them itself when it isn't). */
    fun show(context: Context, title: String, text: String, orderId: String?, isNews: Boolean = false) {
        if (needsPermission(context)) return
        val open = PendingIntent.getActivity(
            context,
            (orderId ?: "dashit").hashCode(),
            Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notification = NotificationCompat.Builder(context, if (isNews) NEWS_CHANNEL_ID else CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_dashit)
            .setColor(0xFFFF5B00.toInt())
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setCategory(if (isNews) NotificationCompat.CATEGORY_PROMO else NotificationCompat.CATEGORY_STATUS)
            .setPriority(if (isNews) NotificationCompat.PRIORITY_DEFAULT else NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(open)
            .build()
        try {
            NotificationManagerCompat.from(context).notify(orderId ?: if (isNews) "news" else "dashit", 0, notification)
        } catch (_: SecurityException) {
        }
    }
}
