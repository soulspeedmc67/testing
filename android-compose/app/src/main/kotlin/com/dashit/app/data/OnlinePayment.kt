package com.dashit.app.data

import android.app.Activity
import android.util.Log
import com.dashit.app.data.auth.AuthRepository
import com.dashit.app.data.model.UserProfile
import com.razorpay.Checkout
import com.razorpay.PaymentData
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
 * Online payments through Razorpay's own checkout, which offers every way to
 * pay that Razorpay supports in India: UPI (apps installed on the phone, or a
 * UPI ID), debit and credit cards, netbanking, wallets, EMI and Pay Later.
 * Which ones show is set in the Razorpay dashboard (Settings, Payment Methods),
 * not in the app.
 *
 * The app holds no Razorpay key: the small server next to the website
 * (dashit.co.in/api/razorpay/, PHP on Hostinger) creates the Razorpay order and
 * hands back the key id, and afterwards checks Razorpay's signature. Only a
 * confirmed payment places an order, and a payment Razorpay took is never left
 * without one: whenever the result is unclear (the shopper backed out, the
 * result got lost), the server asks Razorpay whether the order was paid.
 *
 * Same flow as the iPhone app (`OnlinePayment.swift`). The checkout reports back
 * to MainActivity, which hands the answer to [onPaymentSuccess] / [onPaymentError].
 */
object OnlinePayment {
    private const val TAG = "DASHitPay"
    private const val SERVER = "https://dashit.co.in/api/razorpay/"
    private const val RESULT_TIMEOUT_MS = 12 * 60_000L

    /** Runs payments and the order writes after them; outlives the checkout sheet. */
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    /** What a confirmed payment leaves behind, saved on the order. */
    data class Receipt(val razorpayOrderId: String, val razorpayPaymentId: String, val amountPaidPaise: Int?)

    class PaymentException(message: String, val cancelled: Boolean = false) : Exception(message)

    private sealed interface Outcome {
        data class Paid(val paymentId: String?, val data: PaymentData?) : Outcome
        data class Failed(val code: Int, val description: String?) : Outcome
    }

    private var pending: CompletableDeferred<Outcome>? = null

    /** Warms the checkout up, so it opens at once when the shopper taps Pay. */
    fun preload(activity: Activity) {
        runCatching { Checkout.preload(activity.applicationContext) }
    }

    /**
     * Takes payment for the order `orderCode` (its DASHit code, sent to
     * Razorpay as the receipt) in Razorpay's checkout. Throws a cancelled
     * PaymentException if the shopper backs out without paying.
     * `onConfirming` fires once the shopper is back and the payment is being checked.
     */
    suspend fun pay(
        activity: Activity,
        orderCode: String,
        amountRupees: Double,
        customer: UserProfile,
        option: PayOption? = null,
        onConfirming: () -> Unit = {}
    ): Receipt {
        val paise = Math.round(amountRupees * 100).toInt()
        // The server only starts a payment for a signed-in shopper, so it needs their token.
        val created = post(
            "create-order.php",
            JSONObject().put("amount", paise).put("receipt", orderCode).put("id_token", AuthRepository.idToken())
        )
        val razorpayOrderId = created.getString("order_id")

        val result = CompletableDeferred<Outcome>()
        pending = result
        val upiPackage = option?.takeIf { it.upiApp != null }?.id?.removePrefix("upi:")
        try {
            withContext(Dispatchers.Main) {
                if (upiPackage != null) {
                    // A UPI app was picked: it opens straight away, with no Razorpay
                    // page (Razorpay's Custom UI kit, UPI intent flow).
                    openUpiApp(activity, created, razorpayOrderId, orderCode, customer, upiPackage, result)
                    return@withContext
                }
                val checkout = Checkout()
                checkout.setKeyID(created.getString("key_id"))
                checkout.setImage(com.dashit.app.R.mipmap.ic_launcher)
                val options = JSONObject()
                    .put("name", "DASHit")
                    .put("description", "Order $orderCode")
                    .put("order_id", razorpayOrderId)
                    .put("currency", created.getString("currency"))
                    .put("amount", created.getInt("amount"))
                    .put("theme", JSONObject().put("color", "#FF5B00"))
                    // Everything the shopper has, ready filled in; they can still change it.
                    .put(
                        "prefill",
                        JSONObject()
                            .put("contact", customer.mobile.takeIf { it.isNotBlank() }?.let { "+91$it" } ?: "")
                            .put("email", customer.email?.takeIf { it.isNotBlank() } ?: "")
                    )
                    // A failed attempt (wrong PIN, bank declined) can be tried again, or with another method.
                    .put("retry", JSONObject().put("enabled", true).put("max_count", 3))
                    .put("timeout", 600)
                    .put("send_sms_hash", true)
                    .put("remember_customer", false)
                // The way to pay picked in the checkout: Razorpay shows only that.
                option?.let { picked ->
                    options.put("config", picked.checkoutConfig())
                    options.getJSONObject("prefill").put("method", picked.method)
                }
                checkout.open(activity, options)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Couldn't start the payment", e)
            result.complete(Outcome.Failed(Checkout.INVALID_OPTIONS, e.message))
        }

        // A result that never comes (the phone dropped it) still ends in a
        // check with Razorpay rather than an endless wait.
        val outcome = withTimeoutOrNull(RESULT_TIMEOUT_MS) { result.await() }
            ?: Outcome.Failed(Checkout.PAYMENT_CANCELED, "No answer from the payment screen")
        pending = null
        withContext(Dispatchers.Main) { releaseUpi() }
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
        // Backing out of a UPI app comes back as an error whose reason says so.
        val reason = failed?.description?.let { runCatching { JSONObject(it).getJSONObject("error").optString("reason") }.getOrNull() }
        val cancelled = failed?.code == Checkout.PAYMENT_CANCELED || reason == "payment_cancelled"
        throw PaymentException(
            when {
                cancelled -> "Payment cancelled. Your order wasn't placed."
                failed?.code == Checkout.NETWORK_ERROR -> "The payment didn't go through: no connection. Nothing was charged."
                else -> "The payment didn't go through. Nothing was charged."
            },
            cancelled
        )
    }

    // MARK: - UPI apps, opened directly

    private var upiSdk: com.razorpay.Razorpay? = null
    private var upiWebView: android.webkit.WebView? = null

    private fun openUpiApp(
        activity: Activity,
        created: JSONObject,
        razorpayOrderId: String,
        orderCode: String,
        customer: UserProfile,
        packageName: String,
        result: CompletableDeferred<Outcome>
    ) {
        releaseUpi()
        val sdk = com.razorpay.Razorpay(activity, created.getString("key_id"))
        // The kit talks to Razorpay through a web view of its own; it sits
        // behind the checkout, never seen: the shopper only sees their UPI app.
        val root = activity.findViewById<android.view.ViewGroup>(android.R.id.content)
        val web = android.webkit.WebView(activity).apply { visibility = android.view.View.INVISIBLE }
        root.addView(web, android.widget.FrameLayout.LayoutParams(1, 1))
        sdk.setWebView(web)
        upiSdk = sdk
        upiWebView = web
        val payload = JSONObject()
            .put("amount", created.getInt("amount"))
            .put("currency", created.getString("currency"))
            .put("order_id", razorpayOrderId)
            .put("description", "Order $orderCode")
            .put("contact", customer.mobile.takeIf { it.isNotBlank() }?.let { "+91$it" } ?: "")
            .put("email", customer.email?.takeIf { it.isNotBlank() } ?: "void@razorpay.com")
            .put("method", "upi")
            .put("_[flow]", "intent")
            .put("upi_app_package_name", packageName)
        sdk.submit(payload, object : com.razorpay.PaymentResultWithDataListener {
            override fun onPaymentSuccess(paymentId: String?, data: PaymentData?) {
                result.complete(Outcome.Paid(paymentId, data))
            }

            override fun onPaymentError(code: Int, description: String?, data: PaymentData?) {
                Log.i(TAG, "UPI payment ended: $code $description")
                result.complete(Outcome.Failed(code, description))
            }
        })
    }

    /** From MainActivity: the UPI app's answer, which the kit reads. */
    fun onActivityResult(requestCode: Int, resultCode: Int, data: android.content.Intent?) {
        upiSdk?.onActivityResult(requestCode, resultCode, data)
    }

    private fun releaseUpi() {
        upiSdk = null
        upiWebView?.let { web ->
            (web.parent as? android.view.ViewGroup)?.removeView(web)
            web.destroy()
        }
        upiWebView = null
    }

    /** From MainActivity: the checkout says the payment went through. */
    fun onPaymentSuccess(paymentId: String?, data: PaymentData?) {
        pending?.complete(Outcome.Paid(paymentId, data))
    }

    /** From MainActivity: the checkout ended without a payment (cancelled, declined, no network). */
    fun onPaymentError(code: Int, description: String?) {
        Log.i(TAG, "Payment ended: $code $description")
        pending?.complete(Outcome.Failed(code, description))
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
