package com.dashit.app.data

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import android.widget.FrameLayout
import com.dashit.app.data.model.UserProfile
import com.razorpay.PaymentData
import com.razorpay.PaymentResultWithDataListener
import com.razorpay.Razorpay
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * UPI payments inside our own checkout, the way Blinkit and Zomato do it: the
 * shopper picks Google Pay, PhonePe or Paytm in the checkout, that app opens
 * straight away, and they come back to a placed order. No Razorpay sheet.
 *
 * Razorpay's Custom UI SDK does the talking to Razorpay. The app holds no
 * Razorpay key: the small server next to the website (dashit.co.in/api/
 * razorpay/, PHP on Hostinger) creates the Razorpay order and hands back the
 * key id, and afterwards checks Razorpay's signature. Only a confirmed payment
 * places an order, and a payment Razorpay took is never left without one:
 * whenever the result is unclear (the shopper backed out of the UPI app, the
 * result got lost), the server asks Razorpay whether the order was paid.
 *
 * Same flow as the iPhone app (`OnlinePayment.swift`).
 */
object OnlinePayment {
    private const val TAG = "DASHitPay"
    private const val SERVER = "https://dashit.co.in/api/razorpay/"
    private const val RESULT_TIMEOUT_MS = 6 * 60_000L

    /** Runs payments and the order writes after them; outlives the checkout sheet. */
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    /** What a confirmed payment leaves behind, saved on the order. */
    data class Receipt(val razorpayOrderId: String, val razorpayPaymentId: String, val amountPaidPaise: Int?)

    class PaymentException(message: String, val cancelled: Boolean = false) : Exception(message)

    /** A UPI app on this phone. `icon` is the app's own launcher icon. */
    data class UpiApp(val packageName: String, val name: String, val icon: Bitmap?, val logoUrl: String?)

    /** The apps most people here pay with, first; any others after, as found. */
    private val preferredOrder = listOf(
        "com.google.android.apps.nbu.paisa.user", // Google Pay
        "com.phonepe.app",
        "net.one97.paytm",
        "in.org.npci.upiapp", // BHIM
        "com.dreamplug.androidapp", // CRED
        "in.amazon.mShop.android.shopping"
    )

    /**
     * The UPI apps on this phone that are ready to pay, best known first.
     * Looked up each time: an app set up a minute ago should show. (Google Pay,
     * for one, only answers UPI links once it's linked to a bank account.)
     */
    suspend fun upiApps(context: Context): List<UpiApp> =
        withContext(Dispatchers.IO) {
            runCatching { Razorpay.getAppsWhichSupportUpi(context.applicationContext) }
                .onFailure { Log.w(TAG, "Couldn't list UPI apps", it) }
                .getOrNull().orEmpty()
                .mapNotNull { details ->
                    val pkg = details.packageName ?: return@mapNotNull null
                    UpiApp(
                        packageName = pkg,
                        name = details.appName ?: pkg,
                        icon = details.iconBase64?.let(::decodeIcon),
                        logoUrl = details.appLogoUrl
                    )
                }
                .distinctBy { it.packageName }
                .sortedBy { preferredOrder.indexOf(it.packageName).let { i -> if (i < 0) Int.MAX_VALUE else i } }
        }

    private fun decodeIcon(base64: String): Bitmap? = runCatching {
        val bytes = Base64.decode(base64.substringAfter("base64,"), Base64.DEFAULT)
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
    }.getOrNull()

    // MARK: - Paying

    private sealed interface Outcome {
        data class Paid(val paymentId: String?, val data: PaymentData?) : Outcome
        data class Failed(val code: Int, val description: String?) : Outcome
    }

    private var razorpay: Razorpay? = null
    private var webView: WebView? = null
    private var pending: CompletableDeferred<Outcome>? = null

    /**
     * Takes payment for the order `orderCode` (its DASHit code, sent to
     * Razorpay as the receipt) through `app`. Throws a cancelled
     * PaymentException if the shopper backs out without paying.
     * `onConfirming` fires once the shopper is back and the payment is being checked.
     */
    suspend fun pay(
        activity: Activity,
        orderCode: String,
        amountRupees: Double,
        customer: UserProfile,
        app: UpiApp,
        onConfirming: () -> Unit = {}
    ): Receipt {
        val paise = Math.round(amountRupees * 100).toInt()
        val created = post("create-order.php", JSONObject().put("amount", paise).put("receipt", orderCode))
        val razorpayOrderId = created.getString("order_id")

        val result = CompletableDeferred<Outcome>()
        pending = result
        try {
            withContext(Dispatchers.Main) {
                val sdk = Razorpay(activity, created.getString("key_id"))
                sdk.setWebView(attachWebView(activity))
                razorpay = sdk
                val payload = JSONObject()
                    .put("amount", created.getInt("amount"))
                    .put("currency", created.getString("currency"))
                    .put("order_id", razorpayOrderId)
                    .put("description", "Order $orderCode")
                    .put("contact", customer.mobile)
                    .put("email", customer.email?.takeIf { it.isNotBlank() } ?: "void@razorpay.com")
                    .put("method", "upi")
                    .put("_[flow]", "intent")
                    .put("upi_app_package_name", app.packageName)
                sdk.submit(payload, object : PaymentResultWithDataListener {
                    override fun onPaymentSuccess(paymentId: String?, data: PaymentData?) {
                        result.complete(Outcome.Paid(paymentId, data))
                    }

                    override fun onPaymentError(code: Int, description: String?, data: PaymentData?) {
                        Log.i(TAG, "Payment ended: $code $description")
                        result.complete(Outcome.Failed(code, description))
                    }
                })
            }
        } catch (e: Exception) {
            Log.w(TAG, "Couldn't start the payment", e)
            result.complete(Outcome.Failed(Razorpay.PAYMENT_ERROR, e.message))
        }

        // A result that never comes (the phone dropped it) still ends in a
        // check with Razorpay rather than an endless wait.
        val outcome = withTimeoutOrNull(RESULT_TIMEOUT_MS) { result.await() }
            ?: Outcome.Failed(Razorpay.PAYMENT_ERROR, "No answer from the UPI app")
        withContext(Dispatchers.Main) { release() }
        onConfirming()

        if (outcome is Outcome.Paid) {
            val data = outcome.data
            val paymentId = data?.paymentId ?: outcome.paymentId
            val signature = data?.signature
            if (!paymentId.isNullOrBlank() && !signature.isNullOrBlank()) {
                val verified = runCatching {
                    post(
                        "verify-payment.php",
                        JSONObject()
                            .put("razorpay_order_id", data.orderId ?: razorpayOrderId)
                            .put("razorpay_payment_id", paymentId)
                            .put("razorpay_signature", signature)
                    )
                }.getOrNull()
                if (verified?.optBoolean("verified") == true) {
                    val paid = if (verified.isNull("amount_paid")) null else verified.optInt("amount_paid")
                    return Receipt(razorpayOrderId, paymentId, paid)
                }
            }
        }

        // Anything short of a checked success: ask Razorpay whether it was paid.
        paidReceipt(razorpayOrderId)?.let { return it }

        val failed = outcome as? Outcome.Failed
        // Backing out of the UPI app comes back as an error whose reason says so.
        val reason = failed?.description?.let { runCatching { JSONObject(it).getJSONObject("error").optString("reason") }.getOrNull() }
        val cancelled = failed?.code == Razorpay.PAYMENT_CANCELED || reason == "payment_cancelled"
        throw PaymentException(
            when {
                cancelled -> "Payment cancelled. Your order wasn't placed."
                failed?.code == Razorpay.NETWORK_ERROR -> "The payment didn't go through: no connection. Nothing was charged."
                else -> "The payment didn't go through. Nothing was charged."
            },
            cancelled
        )
    }

    /**
     * Asks the server (which asks Razorpay) whether this order was paid. A UPI
     * app can confirm a moment after it hands back, so it looks twice.
     */
    private suspend fun paidReceipt(razorpayOrderId: String): Receipt? {
        repeat(2) { attempt ->
            if (attempt > 0) delay(2000)
            val status = runCatching {
                post("payment-status.php", JSONObject().put("razorpay_order_id", razorpayOrderId))
            }.getOrNull() ?: return@repeat
            if (status.optBoolean("paid")) {
                val paymentId = status.optString("razorpay_payment_id")
                if (paymentId.isNotBlank()) {
                    val paid = if (status.isNull("amount_paid")) null else status.optInt("amount_paid")
                    return Receipt(razorpayOrderId, paymentId, paid)
                }
            }
        }
        return null
    }

    /** From MainActivity: the UPI app's answer, which the SDK reads. */
    fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        razorpay?.onActivityResult(requestCode, resultCode, data)
    }

    /**
     * The SDK needs a WebView of its own to talk to Razorpay. It sits behind
     * the checkout, laid out but never drawn: the shopper only sees their UPI app.
     */
    private fun attachWebView(activity: Activity): WebView {
        release()
        val root = activity.findViewById<ViewGroup>(android.R.id.content)
        val web = WebView(activity).apply { visibility = View.INVISIBLE }
        root.addView(web, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        webView = web
        return web
    }

    private fun release() {
        pending = null
        razorpay = null
        webView?.let { web ->
            (web.parent as? ViewGroup)?.removeView(web)
            web.destroy()
        }
        webView = null
    }

    // MARK: - Server

    private suspend fun post(path: String, body: JSONObject): JSONObject = withContext(Dispatchers.IO) {
        val connection = try {
            (URL(SERVER + path).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 10_000
                readTimeout = 25_000
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
                outputStream.use { it.write(body.toString().toByteArray()) }
            }
        } catch (e: Exception) {
            throw PaymentException("Couldn't reach the payment server. Check your connection and try again.")
        }
        try {
            val status = connection.responseCode
            val text = (if (status in 200..299) connection.inputStream else connection.errorStream)
                ?.bufferedReader()?.use { it.readText() }.orEmpty()
            val json = runCatching { JSONObject(text) }.getOrNull()
            if (status !in 200..299 || json == null) {
                throw PaymentException(
                    json?.optString("error")?.takeIf { it.isNotBlank() }
                        ?: "The payment server had a problem. Try again, or choose cash on delivery."
                )
            }
            json
        } catch (e: PaymentException) {
            throw e
        } catch (e: Exception) {
            throw PaymentException("Couldn't reach the payment server. Check your connection and try again.")
        } finally {
            connection.disconnect()
        }
    }
}
