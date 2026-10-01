package com.dashit.app.data

import android.util.Log
import com.dashit.app.data.auth.AuthRepository
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Order notifications by push (Firebase Cloud Messaging), so they arrive even
 * when the app is closed. The phone's token is handed to the DASHit server
 * (public/api/push/), which sends the pushes when an order changes; the app
 * asks it to after placing or cancelling an order.
 */
object Push {
    private const val TAG = "DASHitPush"
    private const val SERVER = "https://dashit.co.in/api/push/"
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var lastRegistered: Pair<String, String>? = null

    /** True once the server has this phone's token: the app's own local notifications step aside. */
    @Volatile
    var isActive = false
        private set

    /** Hands this phone's token to the server for the signed-in shopper. Safe to call often. */
    fun register(token: String? = null) {
        scope.launch {
            runCatching {
                val uid = AuthRepository.user.value?.id ?: return@launch
                val fcm = token ?: FirebaseMessaging.getInstance().token.await()
                if (lastRegistered == (uid to fcm)) return@launch
                post("register.php", JSONObject()
                    .put("id_token", AuthRepository.idToken())
                    .put("token", fcm)
                    .put("platform", "android")
                    .put("app", "customer"))
                lastRegistered = uid to fcm
                isActive = true
            }.onFailure { Log.w(TAG, "Couldn't register for notifications", it) }
        }
    }

    /** Asks the server to send the push for this order's current status (it sends each once). */
    fun orderChanged(orderId: String) {
        scope.launch {
            runCatching {
                post("notify.php", JSONObject().put("id_token", AuthRepository.idToken()).put("orderId", orderId))
            }.onFailure { Log.w(TAG, "Couldn't ask for the order notification", it) }
        }
    }

    private fun post(path: String, body: JSONObject) {
        val connection = (URL(SERVER + path).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 10_000
            readTimeout = 20_000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
        }
        try {
            connection.outputStream.use { it.write(body.toString().toByteArray()) }
            val status = connection.responseCode
            if (status !in 200..299) throw IllegalStateException("$path answered $status")
        } finally {
            connection.disconnect()
        }
    }
}

/** Receives pushes; the system shows them itself while the app is closed. */
class PushService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        Push.register(token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val note = message.notification ?: return
        OrderNotifications.show(
            applicationContext,
            note.title ?: "DASHit",
            note.body ?: "",
            message.data["orderId"]
        )
    }
}
