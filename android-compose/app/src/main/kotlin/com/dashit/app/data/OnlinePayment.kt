package com.dashit.app.data

import android.app.Activity
import com.dashit.app.data.model.UserProfile
import com.razorpay.Checkout
import com.razorpay.PaymentData
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Razorpay payments, the same flow as the iPhone app (`OnlinePayment.swift`).
 * The app holds no Razorpay key: the small server next to the website
 * (dashit.co.in/api/razorpay/, PHP on Hostinger) creates the Razorpay order
 * and hands back the key id, Razorpay's checkout takes the payment, and the
 * server then checks Razorpay's signature. Only a verified payment places
 * an order.
 *
 * Razorpay reports the result to the activity; MainActivity forwards it here.
 */
object OnlinePayment {
    private const val SERVER = "https://dashit.co.in/api/razorpay/"

    /** What a confirmed payment leaves behind, saved on the order. */
    data class Receipt(val razorpayOrderId: String, val razorpayPaymentId: String, val amountPaidPaise: Int?)

    class PaymentException(message: String, val cancelled: Boolean = false) : Exception(message)

    private var pending: CompletableDeferred<PaymentData>? = null

    /** Takes payment for the order `orderCode`; throws a cancelled PaymentException if the shopper backs out. */
    suspend fun pay(activity: Activity, orderCode: String, amountRupees: Double, customer: UserProfile): Receipt {
        val paise = Math.round(amountRupees * 100).toInt()
        val created = post("create-order.php", JSONObject().put("amount", paise).put("receipt", orderCode))

        val result = CompletableDeferred<PaymentData>()
        pending = result
        withContext(Dispatchers.Main) {
            val checkout = Checkout()
            checkout.setKeyID(created.getString("key_id"))
            val prefill = JSONObject().put("contact", customer.mobile)
            customer.email?.takeIf { it.isNotBlank() }?.let { prefill.put("email", it) }
            checkout.open(
                activity,
                JSONObject()
                    .put("name", "DASHit")
                    .put("description", "Order $orderCode")
                    .put("order_id", created.getString("order_id"))
                    .put("amount", created.getInt("amount"))
                    .put("currency", created.getString("currency"))
                    .put("prefill", prefill)
                    .put("theme", JSONObject().put("color", "#FF5B00"))
            )
        }
        val data = result.await()

        val paymentId = data.paymentId
        val orderId = data.orderId
        val signature = data.signature
        if (paymentId.isNullOrBlank() || orderId.isNullOrBlank() || signature.isNullOrBlank()) {
            throw PaymentException("Razorpay didn't send the payment details back. If money was taken, message us on WhatsApp.")
        }
        val verified = post(
            "verify-payment.php",
            JSONObject()
                .put("razorpay_order_id", orderId)
                .put("razorpay_payment_id", paymentId)
                .put("razorpay_signature", signature)
        )
        if (!verified.optBoolean("verified")) {
            throw PaymentException("This payment couldn't be confirmed, so the order wasn't placed.")
        }
        val paid = if (verified.isNull("amount_paid")) null else verified.optInt("amount_paid")
        return Receipt(orderId, paymentId, paid)
    }

    /** From MainActivity's PaymentResultWithDataListener. */
    fun onPaymentSuccess(data: PaymentData?) {
        val result = pending ?: return
        pending = null
        if (data == null) result.completeExceptionally(PaymentException("Razorpay didn't send the payment details back."))
        else result.complete(data)
    }

    /** From MainActivity's PaymentResultWithDataListener. */
    fun onPaymentError(code: Int, description: String?) {
        val result = pending ?: return
        pending = null
        val cancelled = code == Checkout.PAYMENT_CANCELED
        val message = when {
            cancelled -> "Payment cancelled. Your order wasn't placed."
            code == Checkout.NETWORK_ERROR -> "The payment didn't go through: no connection. Nothing was charged."
            else -> "The payment didn't go through. Nothing was charged."
        }
        result.completeExceptionally(PaymentException(message, cancelled))
    }

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
